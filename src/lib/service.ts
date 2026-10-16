import { randomUUID } from "node:crypto";
import {
  calculate,
  digest,
  fixtures,
  validateSnapshot,
  validateScenario,
  MODE,
  SCHEMA_VERSION,
  FIXTURE_VERSION,
  MODEL_VERSION,
  CALC_VERSION,
} from "./engine";
import type { Snapshot, Scenario, TenantId, Order } from "./types";
import type { DocumentStore } from "./storage";
import { ApiError } from "./security";

interface StoredProposal {
  id: string;
  created_at: number;
  version: string;
  input_hash: string;
  scenario: Scenario;
  snapshot: Snapshot;
}
interface Draft {
  id: string;
  tenant: TenantId;
  proposal_id: string;
  plan_id: string;
  created_at: number;
  status: "local_draft_unsent" | "canceled_local";
  orders: Order[];
  spend: number;
  cash_floor: number;
  input_hash: string;
  synthetic: true;
}
interface Audit {
  id: string;
  created_at: number;
  event: string;
  detail: Record<string, unknown>;
}
interface TenantData {
  snapshot: Snapshot;
  proposals: StoredProposal[];
  drafts: Draft[];
  audit: Audit[];
}
export interface Workspace {
  schema: 1;
  tenants: Record<TenantId, TenantData>;
}
function seed(): Workspace {
  const f = fixtures(),
    one = (snapshot: Snapshot): TenantData => ({
      snapshot,
      proposals: [],
      drafts: [],
      audit: [],
    });
  return {
    schema: 1,
    tenants: {
      packaging: one(f.packaging),
      trading: one(f.trading),
      homeware: one(f.homeware),
    },
  };
}
function tenantId(value: unknown): TenantId {
  if (
    typeof value !== "string" ||
    !["packaging", "trading", "homeware"].includes(value)
  )
    throw new ApiError(
      "Unknown fictional SME. Choose packaging, trading or homeware.",
    );
  return value as TenantId;
}
export class RelayService {
  private writes: boolean;
  private now: () => number;
  constructor(
    private store: DocumentStore<Workspace>,
    options: { writesEnabled?: boolean; now?: () => number } = {},
  ) {
    this.writes = options.writesEnabled ?? true;
    this.now = options.now ?? (() => Date.now() / 1000);
  }
  private requireWrites() {
    if (!this.writes)
      throw new ApiError(
        "Saving is paused by the operator. Existing evidence remains readable.",
        503,
      );
  }
  private async read(key: string): Promise<Workspace> {
    const state = await this.store.read(key);
    if (!state)
      throw new ApiError(
        "Demo workspace expired. Reload to start a new workspace.",
        401,
      );
    return state;
  }
  private log(
    data: TenantData,
    event: string,
    detail: Record<string, unknown>,
  ) {
    data.audit.unshift({
      id: randomUUID(),
      created_at: this.now(),
      event,
      detail,
    });
    data.audit = data.audit.slice(0, 200);
  }
  async initialize(key: string): Promise<void> {
    if (await this.store.read(key)) return;
    this.requireWrites();
    await this.store.transact(key, seed, () => true);
  }
  async state(key: string, tenant: unknown) {
    const id = tenantId(tenant),
      state = await this.read(key),
      d = state.tenants[id];
    return {
      tenant: { id, name: d.snapshot.name },
      tenants: Object.entries(state.tenants).map(([id, t]) => ({
        id,
        name: t.snapshot.name,
        sector: t.snapshot.sector,
      })),
      snapshot: d.snapshot,
      version: digest(d.snapshot),
      drafts: d.drafts,
      audit: d.audit,
      mode: MODE,
      writes_enabled: this.writes,
    };
  }
  async simulate(key: string, tenant: unknown, input: unknown) {
    const id = tenantId(tenant),
      scenario = validateScenario(input);
    const compute = (state: Workspace) => {
      const d = state.tenants[id],
        result = calculate(d.snapshot, scenario),
        proposal = {
          ...result,
          id: "P-" + randomUUID().slice(0, 12),
          created_at: this.now(),
        };
      if (this.writes) {
        d.proposals.unshift({
          id: proposal.id,
          created_at: proposal.created_at,
          version: result.version,
          input_hash: result.input_hash,
          scenario,
          snapshot: structuredClone(d.snapshot),
        });
        const drafted = new Set(d.drafts.map((x) => x.proposal_id));
        let count = 0;
        d.proposals = d.proposals.filter(
          (x) => drafted.has(x.id) || ++count <= 100,
        );
        this.log(d, "scenario_evaluated", {
          proposal_id: proposal.id,
          evaluated: result.evaluated,
          input_hash: result.input_hash,
        });
      }
      return proposal;
    };
    // Read-only projection remains usable during an operator write stop; no proposal or audit is saved.
    return this.writes
      ? this.store.transact(key, undefined, compute)
      : compute(await this.read(key));
  }
  async approve(
    key: string,
    tenant: unknown,
    proposalId: unknown,
    planId: unknown,
    confirmed: unknown,
  ) {
    this.requireWrites();
    const id = tenantId(tenant);
    if (confirmed !== true)
      throw new ApiError(
        "Confirm the example cash floor, quantities and supplier terms first.",
      );
    return this.store.transact(key, undefined, (state) => {
      const d = state.tenants[id],
        existing = d.drafts.find((x) => x.proposal_id === proposalId);
      if (existing) {
        if (existing.plan_id !== planId)
          throw new ApiError(
            "This proposal already has a different draft. Rerun the scenario.",
            409,
          );
        return { draft: existing, duplicate: true };
      }
      const p = d.proposals.find((x) => x.id === proposalId);
      if (!p)
        throw new ApiError(
          "Proposal not found in this workspace. Run a new scenario.",
          409,
        );
      if (this.now() - p.created_at > 1800)
        throw new ApiError("Proposal expired. Rerun the scenario.", 409);
      if (digest(d.snapshot) !== p.version)
        throw new ApiError("Snapshot changed. Rerun the scenario.", 409);
      const result = calculate(d.snapshot, p.scenario);
      if (result.input_hash !== p.input_hash)
        throw new ApiError(
          "Calculation version changed. Run a fresh scenario.",
          409,
        );
      if (result.blocked.length)
        throw new ApiError(result.blocked.join(" "), 422);
      const plan = result.plans.find((x) => x.id === planId);
      if (!plan || !plan.feasible || plan.lost >= result.baseline.lost)
        throw new ApiError(
          "Selected recovery does not meet the modeled approval constraints.",
          422,
        );
      if (d.drafts.some((x) => x.status === "local_draft_unsent"))
        throw new ApiError(
          "An outstanding unsent draft exists. Review or cancel it first.",
          409,
        );
      if (d.drafts.length >= 200)
        throw new ApiError(
          "Demo draft limit reached. Export your evidence and reset this SME.",
          413,
        );
      const draft: Draft = {
        id: "D-" + randomUUID().slice(0, 10),
        tenant: id,
        proposal_id: p.id,
        plan_id: plan.id,
        created_at: this.now(),
        status: "local_draft_unsent",
        orders: plan.orders,
        spend: plan.spend,
        cash_floor: p.scenario.cash_floor,
        input_hash: p.input_hash,
        synthetic: true,
      };
      d.drafts.unshift(draft);
      this.log(d, "local_draft_created", {
        draft_id: draft.id,
        proposal_id: p.id,
        spend: draft.spend,
      });
      return { draft, duplicate: false };
    });
  }
  async cancel(key: string, tenant: unknown, draftId: unknown) {
    this.requireWrites();
    const id = tenantId(tenant);
    return this.store.transact(key, undefined, (state) => {
      const d = state.tenants[id],
        draft = d.drafts.find((x) => x.id === draftId);
      if (!draft) throw new ApiError("Draft not found in this workspace.");
      if (draft.status !== "canceled_local") {
        draft.status = "canceled_local";
        this.log(d, "local_draft_canceled", { draft_id: draft.id });
      }
      return { ok: true };
    });
  }
  async importSnapshot(key: string, tenant: unknown, input: unknown) {
    this.requireWrites();
    const id = tenantId(tenant);
    let snapshot: Snapshot;
    try {
      snapshot = validateSnapshot(input, id);
    } catch (e) {
      throw new ApiError(
        `Import rejected; existing records retained. ${(e as Error).message}`,
      );
    }
    snapshot.import_revision = randomUUID();
    await this.store.transact(key, undefined, (state) => {
      const d = state.tenants[id];
      d.snapshot = snapshot;
      this.log(d, "synthetic_snapshot_imported", { version: digest(snapshot) });
      return true;
    });
    return this.state(key, id);
  }
  async reset(key: string, tenant: unknown, confirmed: unknown) {
    this.requireWrites();
    const id = tenantId(tenant);
    if (confirmed !== true)
      throw new ApiError(
        "Confirm restoration of the fictional fixture and removal of its saved demo history.",
      );
    await this.store.transact(key, undefined, (state) => {
      state.tenants[id] = {
        snapshot: fixtures()[id],
        proposals: [],
        drafts: [],
        audit: [],
      };
      return true;
    });
    return this.state(key, id);
  }
  async export(key: string, tenant: unknown) {
    const id = tenantId(tenant),
      state = await this.read(key),
      d = state.tenants[id];
    return {
      synthetic: true,
      mode: MODE,
      tenant: id,
      snapshot: d.snapshot,
      version: digest(d.snapshot),
      proposals: d.proposals,
      drafts: d.drafts,
      audit: d.audit,
      exported_at: this.now(),
      schema_version: SCHEMA_VERSION,
      fixture_version: FIXTURE_VERSION,
      model_version: MODEL_VERSION,
      calc_version: CALC_VERSION,
      retention:
        "100 undrafted proposals plus referenced drafts, 200 drafts and 200 audit events per SME; 2MiB document ceiling. Synthetic demo only.",
    };
  }
}
