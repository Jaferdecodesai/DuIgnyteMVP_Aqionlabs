"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  FileCheck2,
  FileJson,
  FlaskConical,
  LayoutDashboard,
  Link2,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import type {
  Calculation,
  DailyRow,
  Plan,
  Scenario,
  Snapshot,
} from "@/lib/types";

type View = "overview" | "evidence" | "connections" | "pilot";
interface Draft {
  id: string;
  created_at?: number;
  status: string;
  orders: Plan["orders"];
  spend: number;
}
interface Audit {
  id?: string;
  action?: string;
  event?: string;
  created_at?: number;
  at?: number;
  detail?: unknown;
  details?: unknown;
}
interface Workspace {
  tenants: { id: string; name: string }[];
  tenant: { id: string; name: string };
  snapshot: Snapshot;
  version: string;
  drafts: Draft[];
  audit: Audit[];
  csrf: string;
  writes_enabled: boolean;
  storage: string;
}
type Proposal = Calculation & { id: string; created_at: number };
type ApiError = Error & { accessRequired?: boolean };
const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "evidence", label: "Evidence", icon: FileCheck2 },
  { id: "connections", label: "Connections", icon: Link2 },
  { id: "pilot", label: "Pilot", icon: FlaskConical },
] as const;
const presets = [
  { label: "Shipment delay", delay: 7, demand: 0, freight: 0 },
  { label: "Combined shock", delay: 7, demand: 20, freight: 25 },
  { label: "Stress test", delay: 14, demand: 40, freight: 75 },
] as const;
const number = (value: number) =>
  new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 }).format(value);
const money = (value: number) =>
  `AED ${new Intl.NumberFormat("en-AE", { maximumFractionDigits: 2 }).format(value)}`;
const date = (value?: number) =>
  value
    ? new Date(value * 1000).toLocaleString("en-GB", {
        timeZone: "Asia/Dubai",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recorded in this workspace";
function auditText(event: Audit) {
  const kind = event.action || event.event || "",
    detail = event.detail || event.details;
  const data =
    detail && typeof detail === "object"
      ? (detail as Record<string, unknown>)
      : {};
  if (kind === "scenario_evaluated")
    return {
      title: "Scenario evaluated",
      text: `${typeof data.evaluated === "number" ? number(data.evaluated) : "Multiple"} recovery combinations evaluated.`,
    };
  if (kind === "local_draft_created")
    return {
      title: "Unsent draft created",
      text: `${String(data.draft_id || "Draft")} saved for owner review${typeof data.spend === "number" ? ` · ${money(data.spend)}` : ""}. No order was sent.`,
    };
  if (kind === "local_draft_canceled")
    return {
      title: "Unsent draft canceled",
      text: `${String(data.draft_id || "Draft")} canceled in this workspace. No external order was affected.`,
    };
  if (kind === "synthetic_snapshot_imported")
    return {
      title: "Synthetic snapshot imported",
      text: "Source data updated. Earlier proposals require a fresh scenario.",
    };
  return {
    title: kind.replaceAll("_", " ") || "Workspace action",
    text:
      typeof detail === "string"
        ? detail
        : "Action recorded in this synthetic workspace.",
  };
}

export default function RelayApp() {
  const [state, setState] = useState<Workspace | null>(null),
    [tenant, setTenant] = useState("packaging"),
    [view, setView] = useState<View>("overview");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [access, setAccess] = useState(false),
    [code, setCode] = useState("");
  const [scenario, setScenario] = useState<Scenario>({
      delay: 7,
      demand: 20,
      freight: 25,
      cash_floor: 24000,
    }),
    [proposal, setProposal] = useState<Proposal | null>(null),
    [dirty, setDirty] = useState(false),
    [measure, setMeasure] = useState<"stock" | "cash">("stock"),
    [selected, setSelected] = useState<Plan | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [expired, setExpired] = useState(false);
  const reviewRef = useRef<HTMLDialogElement>(null),
    resetRef = useRef<HTMLDialogElement>(null),
    mainRef = useRef<HTMLElement>(null);
  const request = useCallback(
    async (path: string, payload?: unknown): Promise<any> => {
      let response: Response;
      try {
        response = await fetch(path, {
          credentials: "same-origin",
          cache: "no-store",
          ...(payload !== undefined
            ? {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Relay-CSRF": state?.csrf || "",
                },
                body: JSON.stringify(payload),
              }
            : {}),
        });
      } catch {
        throw new Error(
          "The server could not be reached. Check your connection, then retry.",
        );
      }
      let body;
      try {
        body = await response.json();
      } catch {
        throw new Error(
          "The server returned an unreadable response. Please retry.",
        );
      }
      if (!response.ok) {
        const e: ApiError = new Error(
          typeof body.error === "string"
            ? body.error
            : "This request could not be completed.",
        );
        e.accessRequired = response.status === 401 && body.access_required;
        throw e;
      }
      return body;
    },
    [state?.csrf],
  );
  const load = useCallback(
    async (id = tenant, defaults = false) => {
      const value: Workspace = await request(
        `/api/state?tenant=${encodeURIComponent(id)}`,
      );
      setState(value);
      setAccess(false);
      if (defaults)
        setScenario({
          delay: 7,
          demand: 20,
          freight: 25,
          cash_floor: value.snapshot.cash_floor,
        });
      return value;
    },
    [request, tenant],
  );
  useEffect(() => {
    let active = true;
    request("/api/state?tenant=packaging")
      .then((value) => {
        if (active) {
          setState(value);
          setScenario((s) => ({ ...s, cash_floor: value.snapshot.cash_floor }));
        }
      })
      .catch((e: ApiError) => {
        if (active) {
          setAccess(!!e.accessRequired);
          if (!e.accessRequired) setError(e.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []); // Session starts only after a same-origin request.
  useEffect(() => {
    if (!proposal) return;
    const check = () =>
      setExpired(Date.now() / 1000 - proposal.created_at > 1800);
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [proposal]);
  const act = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const navigate = (id: View) => {
    setView(id);
    setError("");
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const change = (key: keyof Scenario, value: number) => {
    setScenario((s) => ({ ...s, [key]: value }));
    if (proposal) setDirty(true);
    setConfirmed(false);
  };
  const runScenario = (inputs: Scenario) => {
    void act(async () => {
      const p: Proposal = await request("/api/simulate", { tenant, scenario: inputs });
      setProposal(p);
      setDirty(false);
      setExpired(false);
      await load();
      setSuccess(
        `Scenario complete. ${number(p.evaluated)} combinations evaluated.`,
      );
    });
  };
  const run = (event: FormEvent) => {
    event.preventDefault();
    runScenario(scenario);
  };
  const applyPreset = (preset: (typeof presets)[number]) => {
    setScenario((s) => ({ ...s, delay: preset.delay, demand: preset.demand, freight: preset.freight }));
    if (proposal) setDirty(true);
    setConfirmed(false);
  };
  const save = () =>
    void act(async () => {
      if (!proposal || !selected || !confirmed || dirty || expired) return;
      const result = await request("/api/approve", {
        tenant,
        proposal_id: proposal.id,
        plan_id: selected.id,
        confirm: true,
      });
      await load();
      reviewRef.current?.close();
      setSelected(null);
      setView("evidence");
      setSuccess(
        `${result.duplicate ? "Restored existing" : "Created"} unsent draft ${result.draft.id}. No order was sent and no money moved.`,
      );
    });
  const download = (value: unknown, filename: string) => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    await act(async () => {
      if (file.size > 256 * 1024)
        throw new Error(
          "File exceeds 256 KiB. Choose a smaller synthetic snapshot.",
        );
      let value;
      try {
        value = JSON.parse(await file.text());
      } catch {
        throw new Error(
          "The file is not valid JSON. Existing source data was preserved.",
        );
      }
      if (value?.synthetic !== true)
        throw new Error(
          "Only snapshots marked synthetic: true can be imported. Existing source data was preserved.",
        );
      await request("/api/import", { tenant, snapshot: value });
      setProposal(null);
      setDirty(false);
      await load();
      setSuccess(
        "Synthetic snapshot imported. Previous proposals are invalidated; run a fresh scenario.",
      );
    });
  };
  const retry = () =>
    void act(async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        setLoading(false);
      }
    });
  if (loading)
    return (
      <div className="startup">
        <Brand />
        <div role="status">
          <Loader2 className="spin" />
          Loading your workspace…
        </div>
        <p>Preparing your synthetic business snapshot.</p>
      </div>
    );
  if (access)
    return (
      <div className="startup">
        <Brand />
        <form
          className="access-card"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              await request("/api/access", { code });
              await load();
            });
          }}
        >
          <span className="eyebrow">PRIVATE DEMO ACCESS</span>
          <h1>Open your demo workspace</h1>
          <p>
            Enter the shared demo code. This creates an anonymous browser
            workspace, rather than a business account.
          </p>
          <label htmlFor="access-code">Demo access code</label>
          <input
            id="access-code"
            type="password"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button className="button primary" disabled={busy}>
            {busy ? "Opening…" : "Open workspace"}
            <ArrowRight size={18} />
          </button>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
        </form>
      </div>
    );
  if (!state)
    return (
      <div className="startup">
        <Brand />
        <h1>Workspace unavailable</h1>
        <p role="alert" className="notice error">
          {error || "Your workspace could not be loaded."}
        </p>
        <button className="button primary" onClick={retry} disabled={busy}>
          Retry loading workspace
          <RefreshCw size={18} />
        </button>
      </div>
    );
  const snap = state.snapshot,
    active = state.drafts.filter((d) => d.status === "local_draft_unsent"),
    recommended = proposal?.plans.find((p) => p.id === proposal.recommended_id),
    chosen = recommended || proposal?.baseline,
    canWrite = state.writes_enabled && !busy;
  const blocked = !!proposal?.blocked.length;
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">RESILIENCE WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-label={label}
              className={`nav-item ${view === id ? "active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
              {id === "evidence" && active.length > 0 && (
                <span className="nav-count">{active.length}</span>
              )}
              {view === id && (
                <ChevronRight size={16} className="nav-chevron" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card">
            <FlaskConical size={20} />
            <strong>Synthetic demo</strong>
            <p>A safe space to explore better business decisions.</p>
            <span>No live integrations</span>
          </div>
          <div className="byline">
            Built by <strong>AqionLabs</strong>
            <ArrowUpRight size={14} />
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><Brand /></div>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{nav.find((n) => n.id === view)?.label}</strong>
          </div>
          <span className="demo-pill">
            <span />
            Synthetic demo
          </span>
          <div className="avatar" aria-label="Anonymous demo workspace">
            AR
          </div>
        </header>
        <main id="main" ref={mainRef} tabIndex={-1} aria-busy={busy}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR BUSINESS, IN BALANCE</div>
              <h1>
                {view === "overview"
                  ? "Stay ahead of the disruption."
                  : view === "evidence"
                    ? "Every decision, accounted for."
                    : view === "connections"
                      ? "Know what your model knows."
                      : "A pilot with a clear purpose."}
              </h1>
              <p>
                {view === "overview"
                  ? "Explore recovery options. Protect your cash. Make the call with confidence."
                  : view === "evidence"
                    ? "Review unsent drafts and trace the steps behind each decision."
                    : view === "connections"
                      ? "Inspect fictional sources and test your own synthetic scenarios."
                      : "A proposed path from a working model to measurable SME outcomes."}
              </p>
            </div>
            <label className="tenant-control">
              <span>FICTIONAL SME</span>
              <select
                aria-label="Fictional SME"
                value={tenant}
                disabled={busy}
                onChange={(e) => {
                  const id = e.target.value;
                  void act(async () => {
                    await load(id, true);
                    setTenant(id);
                    setProposal(null);
                    setDirty(false);
                    setSuccess("Loaded a separate fictional SME snapshot.");
                  });
                }}
              >
                {state.tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="snapshot-strip">
            <span className="snapshot-icon">
              <Box size={18} />
            </span>
            <strong>{snap.name}</strong>
            <span>{snap.sku}</span>
            <span className="snapshot-date">
              <Clock3 size={14} />
              Scenario starts {snap.as_of}
            </span>
            <span className={`badge ${snap.age_hours > 24 ? "amber" : ""}`} title="Modeled source age within the fictional scenario">
              Source age {snap.age_hours}h
            </span>
          </div>
          {error && (
            <div role="alert" className="notice error">
              <CircleHelp size={18} />
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={18} />
              </button>
            </div>
          )}
          {success && (
            <div role="status" className="notice success">
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}
          {!state.writes_enabled && (
            <div className="notice">
              Saving is paused by the operator. You can still calculate
              scenarios and export existing evidence.
            </div>
          )}
          {snap.age_hours > 24 && (
            <div className="notice amber"><Clock3 size={18} /><span>This source is older than the 24-hour freshness limit. You can inspect projections; approval stays blocked until you import a fresh synthetic snapshot or restore the original fixture in Connections.</span></div>
          )}
          {view === "overview" && (
            <>
              {!proposal && (
                <section className="demo-launchpad" aria-label="Challenge demo walkthrough">
                  <div>
                    <span className="eyebrow">EXPLORE THE WORKING MVP</span>
                    <h2>From delayed shipment to a cash-feasible recovery.</h2>
                    <p>Model a combined shock, compare feasible options, then approve an unsent draft. All data is fictional.</p>
                  </div>
                  <button className="button primary" disabled={busy} onClick={() => {
                    const demo = { delay: 7, demand: 20, freight: 25, cash_floor: snap.cash_floor };
                    setScenario(demo);
                    setConfirmed(false);
                    runScenario(demo);
                  }}>
                    {busy ? "Calculating…" : "Run challenge demo"}<ArrowRight size={18} />
                  </button>
                </section>
              )}
              <div className="overview-summary">
                <div>
                  <span className="summary-square">
                    <Truck size={21} />
                  </span>
                  <div>
                    <span>Inbound shipment</span>
                    <strong>
                      {number(snap.inbound.qty)} units · Day {snap.inbound.day}
                    </strong>
                  </div>
                  <span className="badge amber">Test a delay</span>
                </div>
                <div>
                  <span className="summary-square">
                    <Wallet size={21} />
                  </span>
                  <div>
                    <span>Opening cash</span>
                    <strong>{money(snap.cash)}</strong>
                  </div>
                </div>
                <div>
                  <span className="summary-square">
                    <PackageCheck size={21} />
                  </span>
                  <div>
                    <span>Stock on hand</span>
                    <strong>
                      {number(snap.stock)} {snap.unit}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="workbench-grid">
                <section className="panel scenario-panel">
                  <div className="panel-heading">
                    <span className="section-icon">
                      <SlidersHorizontal size={19} />
                    </span>
                    <div>
                      <h2>Model the disruption</h2>
                      <p>A few inputs. A clearer next step.</p>
                    </div>
                    <span className="step-tag">01</span>
                  </div>
                  <form onSubmit={run}>
                    <fieldset className="preset-field" disabled={busy}>
                      <legend>Start with a scenario</legend>
                      <div className="preset-buttons">
                        {presets.map((preset) => (
                          <button key={preset.label} type="button"
                            aria-pressed={scenario.delay === preset.delay && scenario.demand === preset.demand && scenario.freight === preset.freight}
                            onClick={() => applyPreset(preset)}>{preset.label}</button>
                        ))}
                      </div>
                    </fieldset>
                    <Range
                      label="Shipment delay"
                      value={scenario.delay}
                      suffix=" days"
                      min={0}
                      max={21}
                      onChange={(v) => change("delay", v)}
                      disabled={busy}
                    />
                    <Range
                      label="Demand increase"
                      value={scenario.demand}
                      suffix="%"
                      min={0}
                      max={100}
                      onChange={(v) => change("demand", v)}
                      disabled={busy}
                    />
                    <Range
                      label="Freight increase"
                      value={scenario.freight}
                      suffix="%"
                      min={0}
                      max={200}
                      onChange={(v) => change("freight", v)}
                      disabled={busy}
                    />
                    <div className="floor-field">
                      <label htmlFor="cash-floor">Operating cash floor</label>
                      <div>
                        <span>AED</span>
                        <input
                          id="cash-floor"
                          type="number"
                          min={0}
                          max={10000000}
                          step={100}
                          value={scenario.cash_floor}
                          onChange={(e) =>
                            change("cash_floor", Number(e.target.value))
                          }
                          required
                          disabled={busy}
                        />
                        <ShieldCheck size={17} />
                      </div>
                      <p>
                        Keep cash available for payroll, rent and other
                        obligations.
                      </p>
                    </div>
                    <button
                      className="button primary run-button"
                      disabled={busy}
                    >
                      {busy ? (
                        <>
                          <Loader2 size={18} className="spin" />
                          Calculating…
                        </>
                      ) : (
                        <>
                          Run scenario
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                    <div className="private-note">
                      <ShieldCheck size={14} />
                      Simulation only. You stay in control.
                    </div>
                  </form>
                </section>
                <section className="panel projection-panel">
                  <div className="panel-heading">
                    <span className="section-icon">
                      <TrendingUp size={19} />
                    </span>
                    <div>
                      <h2>Your 30-day outlook</h2>
                      <p>Stock and cash, side by side.</p>
                    </div>
                    <span className="badge">
                      {proposal ? "PROJECTED" : "READY TO MODEL"}
                    </span>
                  </div>
                  {!proposal ? (
                    <div className="projection-empty">
                      <div className="empty-chart">
                        <BarChart3 size={50} strokeWidth={1.1} />
                        <span />
                        <span />
                        <span />
                      </div>
                      <h3>A disruption is a decision point.</h3>
                      <p>
                        Set your conditions and run a scenario to see how
                        recovery choices could change the next 30 days.
                      </p>
                      <span className="empty-flow">
                        Set conditions
                        <ChevronRight size={13} />
                        Compare options
                        <ChevronRight size={13} />
                        Review your plan
                      </span>
                    </div>
                  ) : (
                    <>
                      {dirty && (
                        <div className="notice amber">
                          Controls changed. These results describe the previous
                          run. Run the scenario again before review.
                        </div>
                      )}
                      {expired && (
                        <div className="notice amber">
                          Proposal expired after 30 minutes. Run the scenario
                          again.
                        </div>
                      )}
                      {blocked && (
                        <div className="notice error">
                          {proposal.blocked.join(" ")}
                        </div>
                      )}
                      {recommended && !dirty && !expired && !blocked && (
                        <section className="decision-summary" aria-label="Recommended next step">
                          <span className="decision-icon"><ShieldCheck size={23} /></span>
                          <div>
                            <span className="eyebrow">RECOMMENDED NEXT STEP</span>
                            <h3>{recommended.orders.map((order) => `${number(order.qty)} units from ${order.name}`).join(" + ")}</h3>
                            <p>{number(recommended.fulfilled - proposal.baseline.fulfilled)} additional units fulfilled · {money(recommended.min_cash - proposal.scenario.cash_floor)} above your cash floor</p>
                          </div>
                        </section>
                      )}
                      <div className="projection-metrics">
                        <Metric
                          label="Units fulfilled"
                          value={number(chosen!.fulfilled)}
                          note={`Baseline ${number(proposal.baseline.fulfilled)}`}
                        />
                        <Metric
                          label="Minimum cash"
                          value={money(chosen!.min_cash)}
                          note={`Floor ${money(proposal.scenario.cash_floor)}`}
                        />
                        <Metric
                          label="Stockout days"
                          value={number(chosen!.stockout_days)}
                          note={`Baseline ${proposal.baseline.stockout_days} days`}
                        />
                      </div>
                      <div className="chart-heading">
                        <span>
                          PROJECTED CLOSING{" "}
                          {measure === "stock" ? "STOCK · UNITS" : "CASH · AED"}
                        </span>
                        <div className="segmented">
                          {(["stock", "cash"] as const).map((m) => (
                            <button
                              key={m}
                              aria-pressed={measure === m}
                              onClick={() => setMeasure(m)}
                            >
                              {m === "stock" ? "Stock" : "Cash"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <ProjectionChart
                        baseline={proposal.baseline.daily}
                        recovery={chosen!.daily}
                        measure={measure}
                        floor={proposal.scenario.cash_floor}
                      />
                      <div className="chart-legend">
                        <span>
                          <i />
                          Evaluated recovery
                        </span>
                        <span>
                          <i className="baseline" />
                          Wait for shipment
                        </span>
                        {measure === "cash" && (
                          <span>
                            <i className="floor" />
                            Cash floor
                          </span>
                        )}
                      </div>
                      <details className="daily-details">
                        <summary>View 30-day data table</summary>
                        <div
                          className="table-scroll"
                          tabIndex={0}
                          role="region"
                          aria-label="Daily projection data"
                        >
                          <table aria-label="Daily projection values">
                            <thead>
                              <tr>
                                {[
                                  "Day",
                                  "Demand",
                                  "Baseline stock",
                                  "Recovery stock",
                                  "Baseline cash",
                                  "Recovery cash",
                                ].map((h) => (
                                  <th scope="col" key={h}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {proposal.baseline.daily.map((d, i) => (
                                <tr key={d.day}>
                                  <td>{d.day}</td>
                                  <td>{d.demand}</td>
                                  <td>{d.stock}</td>
                                  <td>{chosen!.daily[i]?.stock}</td>
                                  <td>{money(d.cash)}</td>
                                  <td>
                                    {money(chosen!.daily[i]?.cash ?? d.cash)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                      <div className="outcome-note">
                        <CheckCircle2 size={17} />
                        {recommended
                          ? `${number(recommended.fulfilled - proposal.baseline.fulfilled)} additional units fulfilled in this modeled scenario.`
                          : "No eligible recovery recommendation. Inspect the source and constraint reasons below."}
                      </div>
                    </>
                  )}
                </section>
              </div>
              <section className="panel options-panel">
                <div className="panel-heading">
                  <span className="section-icon">
                    <FileCheck2 size={19} />
                  </span>
                  <div>
                    <h2>Choose your next move</h2>
                    <p>Compare the trade-offs before you commit to a draft.</p>
                  </div>
                  <span className="muted small">
                    {proposal
                      ? `${number(proposal.evaluated)} combinations evaluated`
                      : "YOUR OPTIONS"}
                  </span>
                </div>
                {active.length > 0 && (
                  <div className="notice amber">
                    An unsent draft already exists for this SME. Review or
                    cancel it in Evidence before creating another.
                  </div>
                )}
                {!proposal ? (
                  <div className="empty-compact">
                    <span className="dot" />
                    Your baseline and recovery options will appear after the
                    first run.
                  </div>
                ) : (
                  <>
                    <div className="plan-grid">
                      {[proposal.baseline, ...proposal.plans].map((plan) => (
                        <article
                          className={`plan-card ${plan.id === proposal.recommended_id ? "recommended" : ""}`}
                          key={plan.id}
                        >
                          <div className="plan-top">
                            <span
                              className={`badge ${!plan.feasible ? "amber" : ""}`}
                            >
                              {plan.id === proposal.baseline.id
                                ? "REFERENCE"
                                : blocked
                                  ? "SOURCE BLOCKED"
                                  : plan.id === proposal.recommended_id
                                    ? "RECOMMENDED"
                                    : !plan.feasible
                                      ? "INELIGIBLE"
                                      : plan.lost >= proposal.baseline.lost
                                        ? "NO IMPROVEMENT"
                                        : "FEASIBLE"}
                            </span>
                            {plan.id === proposal.recommended_id && (
                              <ShieldCheck size={17} />
                            )}
                          </div>
                          <h3>{plan.label}</h3>
                          <p className="plan-description">
                            {plan.orders.length
                              ? plan.orders
                                  .map(
                                    (o) =>
                                      `${number(o.qty)} units from ${o.name}`,
                                  )
                                  .join(" + ")
                              : "Use existing inbound stock only."}
                          </p>
                          <dl>
                            <div>
                              <dt>Units fulfilled</dt>
                              <dd>{number(plan.fulfilled)}</dd>
                            </div>
                            <div>
                              <dt>Minimum cash</dt>
                              <dd>{money(plan.min_cash)}</dd>
                            </div>
                            <div>
                              <dt>Recovery spend</dt>
                              <dd>{money(plan.spend)}</dd>
                            </div>
                            <div>
                              <dt>Stockout days</dt>
                              <dd>{plan.stockout_days}</dd>
                            </div>
                          </dl>
                          {plan.reasons.length > 0 && (
                            <p className="plan-reason">
                              {plan.reasons.join(" ")}
                            </p>
                          )}
                          {plan.id !== proposal.baseline.id ? (
                            <button
                              className={`button ${plan.id === proposal.recommended_id ? "primary" : "secondary"}`}
                              disabled={
                                !canWrite ||
                                !plan.feasible ||
                                plan.lost >= proposal.baseline.lost ||
                                blocked ||
                                dirty ||
                                expired ||
                                active.length > 0
                              }
                              onClick={() => {
                                setSelected(plan);
                                setConfirmed(false);
                                reviewRef.current?.showModal();
                              }}
                            >
                              Review plan
                              <ArrowRight size={17} />
                            </button>
                          ) : (
                            <span className="baseline-label">
                              Comparison baseline
                            </span>
                          )}
                        </article>
                      ))}
                    </div>
                    <p className="footnote">
                      Plans are compared within the modeled supplier quantities, lead times and cash constraints. All supplier terms are fictional.
                    </p>
                  </>
                )}
              </section>
              <section className="assumptions panel">
                <details>
                  <summary>
                    <CircleHelp size={18} />
                    Understand the model & assumptions
                    <ChevronRight size={17} />
                  </summary>
                  <div>
                    <h3>
                      Local numerical forecast · synthetic fulfilled sales
                    </h3>
                    <p>
                      {proposal
                        ? `Method: ${proposal.forecast.method}. Holdout MAE: ${proposal.forecast.holdout_mae ?? "not available"} units/day. Seasonal-naive MAE: ${proposal.forecast.baseline_mae ?? "not available"} units/day.`
                        : "Run a scenario to inspect its trained numerical method and holdout evaluation."}{" "}
                      These results use synthetic history and do not establish
                      real-world forecast quality. Fulfilled sales can differ
                      from uncensored demand.
                    </p>
                    {proposal && <p>{proposal.forecast.uncertainty_note}</p>}
                    <ul>
                      {proposal?.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                      <li>
                        Existing inbound is prepaid. Recovered sales generate no
                        additional receipts within this conservative horizon.
                      </li>
                      <li>
                        Minimum cash checks include opening cash and payments
                        before receipts. Charts show closing daily balances.
                      </li>
                      <li>
                        Explanations use deterministic templates. No live
                        generative AI or provider connections are active.
                      </li>
                    </ul>
                    {proposal && (
                      <p className="mono">
                        Calculation {proposal.calc_version} · source{" "}
                        {proposal.version} · created {date(proposal.created_at)}{" "}
                        · expires after 30 minutes.
                      </p>
                    )}
                  </div>
                </details>
              </section>
            </>
          )}
          {view === "evidence" && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <span className="section-icon">
                    <FileCheck2 size={19} />
                  </span>
                  <div>
                    <h2>Unsent drafts</h2>
                    <p>Saved decisions for this fictional SME.</p>
                  </div>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        const value = await request(
                          `/api/export?tenant=${tenant}`,
                        );
                        download(value, `relay-${tenant}-evidence.json`);
                        setSuccess(
                          "Evidence JSON downloaded. Fictional data and unsent drafts only.",
                        );
                      })
                    }
                  >
                    <ArrowDownToLine size={17} />
                    Export evidence
                  </button>
                </div>
                {state.drafts.length === 0 ? (
                  <div className="empty-state">
                    <FileCheck2 size={36} />
                    <h3>No drafts yet</h3>
                    <p>
                      Run a scenario, review a feasible plan and confirm it to
                      save an unsent draft.
                    </p>
                    <button
                      className="button secondary"
                      onClick={() => navigate("overview")}
                    >
                      Go to workbench
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="draft-list">
                    {state.drafts.map((d) => (
                      <article className="draft-card" key={d.id}>
                        <div>
                          <span
                            className={`badge ${d.status === "canceled_local" ? "neutral" : ""}`}
                          >
                            {d.status === "canceled_local"
                              ? "CANCELED"
                              : "UNSENT DRAFT"}
                          </span>
                          <h3 className="mono">{d.id}</h3>
                          <p>
                            {d.orders
                              .map((o) => `${o.qty} · ${o.name}`)
                              .join("; ")}
                          </p>
                          <small>{date(d.created_at)}</small>
                        </div>
                        <div>
                          <strong>{money(d.spend)}</strong>
                          {d.status === "local_draft_unsent" && (
                            <button
                              className="button secondary"
                              disabled={!canWrite}
                              onClick={() =>
                                void act(async () => {
                                  await request("/api/cancel", {
                                    tenant,
                                    draft_id: d.id,
                                  });
                                  await load();
                                  setSuccess(
                                    "Unsent draft canceled. No external order was affected.",
                                  );
                                })
                              }
                            >
                              Cancel unsent draft
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <details className="evidence-source">
                  <summary>Source identity & verification details</summary>
                  <p>Saved proposals are bound to the exact source and scenario. A changed source, expired proposal or cash-floor breach prevents approval.</p>
                  <dl><div><dt>Current source version</dt><dd className="mono">{state.version}</dd></div>
                  {proposal && <div><dt>Latest scenario source</dt><dd className="mono">{proposal.version}</dd></div>}</dl>
                  <p>Export evidence to inspect calculation versions and source fingerprints.</p>
                </details>
                <div className="panel-foot">
                  <ShieldCheck size={16} />
                  Nothing is sent to suppliers. No money moves.
                </div>
              </section>
              <section className="panel timeline-panel">
                <div className="panel-heading">
                  <span className="section-icon">
                    <Clock3 size={19} />
                  </span>
                  <div>
                    <h2>Recovery timeline</h2>
                    <p>
                      Actions recorded in this browser’s anonymous workspace.
                    </p>
                  </div>
                </div>
                {state.audit.length === 0 ? (
                  <p className="empty-compact">
                    No recovery actions recorded for this SME yet.
                  </p>
                ) : (
                  <ol className="timeline">
                    {state.audit.map((event, i) => (
                      <li key={event.id || i}>
                        <span className="timeline-dot">
                          <Check size={12} />
                        </span>
                        <div>
                          <strong>{auditText(event).title}</strong>
                          <p>{auditText(event).text}</p>
                          <time>{date(event.created_at || event.at)}</time>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
          {view === "connections" && (
            <>
              <div className="notice">
                <Database size={18} />
                <span>
                  <strong>No live connections</strong> · All data below is
                  fictional. ERP, banking, du and supplier integrations are
                  proposed.
                </span>
              </div>
              <div className="source-grid">
                {[
                  {
                    icon: Box,
                    title: "Inventory & inbound",
                    value: `${number(snap.stock)} ${snap.unit}`,
                    note: `${snap.sku} · ${number(snap.inbound.qty)} prepaid inbound units on day ${snap.inbound.day}`,
                  },
                  {
                    icon: Wallet,
                    title: "Cash & scheduled events",
                    value: money(snap.cash),
                    note: `${snap.receipts.length} scheduled receipts · ${snap.obligations.length} obligations`,
                  },
                  {
                    icon: BarChart3,
                    title: "Fulfilled-sales history",
                    value: `${snap.history.length} daily points`,
                    note: "Fictional observations for local numerical fitting and holdout evaluation.",
                  },
                ].map(({ icon: Icon, title, value, note }) => (
                  <article className="panel source-card" key={title}>
                    <Icon size={24} />
                    <span className="badge neutral">SYNTHETIC SNAPSHOT</span>
                    <h2>{title}</h2>
                    <strong>{value}</strong>
                    <p>{note}</p>
                    <small>
                      Fixture {snap.as_of} · modeled age {snap.age_hours}h
                    </small>
                  </article>
                ))}
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <span className="section-icon">
                    <Truck size={19} />
                  </span>
                  <div>
                    <h2>Fictional supplier terms</h2>
                    <p>
                      Approval, quantity limits and term validity are enforced
                      by the model.
                    </p>
                  </div>
                </div>
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Supplier terms"
                >
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Supplier",
                          "Approved",
                          "Cap / MOQ / pack",
                          "Lead",
                          "Unit price",
                          "Freight",
                          "Valid through",
                        ].map((h) => (
                          <th scope="col" key={h}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {snap.suppliers.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.name}</strong>
                            <small>{s.id}</small>
                          </td>
                          <td>{s.approved ? "Yes, in fixture" : "No"}</td>
                          <td>
                            {s.qty_cap} / {s.moq} / {s.pack}
                          </td>
                          <td>{s.lead} days</td>
                          <td>{money(s.price)}</td>
                          <td>{money(s.freight)}</td>
                          <td>{s.valid_until}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <span className="section-icon">
                    <FileJson size={19} />
                  </span>
                  <div>
                    <h2>Test another synthetic snapshot</h2>
                    <p>
                      Download this format, edit fictional values, then import.
                    </p>
                  </div>
                </div>
                <div className="import-area">
                  <div>
                    <h3>Your data stays scoped to this workspace</h3>
                    <p>
                      JSON only · maximum 256 KiB · synthetic: true required.
                      Imports invalidate earlier proposals. Do not upload real
                      business or personal data.
                    </p>
                  </div>
                  <div className="action-row">
                    <button
                      className="button secondary"
                      onClick={() =>
                        download(
                          snap,
                          `relay-${tenant}-synthetic-snapshot.json`,
                        )
                      }
                    >
                      <ArrowDownToLine size={17} />
                      Download sample JSON
                    </button>
                    <label
                      className={`button primary file-button ${!canWrite ? "disabled" : ""}`}
                    >
                      <FileJson size={17} />
                      Import synthetic JSON
                      <input
                        aria-label="Import synthetic JSON"
                        type="file"
                        accept="application/json,.json"
                        disabled={!canWrite}
                        onChange={(e) => {
                          void importFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="reset-area">
                  <div>
                    <h3>Start this SME again</h3>
                    <p>
                      Restore its original fixture and remove its saved
                      scenarios, drafts and timeline.
                    </p>
                  </div>
                  <button
                    className="button secondary"
                    disabled={!canWrite}
                    onClick={() => resetRef.current?.showModal()}
                  >
                    <RefreshCw size={16} />
                    Reset SME fixture
                  </button>
                </div>
              </section>
            </>
          )}
          {view === "pilot" && (
            <>
              <section className="pilot-hero">
                <div>
                  <span className="badge">PROPOSED · NOT ENROLLED</span>
                  <h2>A practical test of faster, feasible decisions.</h2>
                  <p>
                    Recruit 160 UAE SMEs across four waves. Establish a
                    baseline, test supported recovery decisions, and measure
                    whether owners can prepare feasible plans faster while
                    preserving their operating cash floor.
                  </p>
                </div>
                <div className="pilot-target">
                  <span>PRIMARY HYPOTHESIS</span>
                  <strong>40%</strong>
                  <p>
                    faster completion of an approved, feasible contingency plan
                  </p>
                  <small>Proposed target, not measured benefit</small>
                </div>
              </section>
              <div className="source-grid">
                {[
                  [
                    "160 SMEs",
                    "Four proposed waves of 40. No pilot partners confirmed.",
                  ],
                  [
                    "150+ enrolled",
                    "Minimum enrollment before intervention. Owner consent and eligibility required.",
                  ],
                  [
                    "Owner authority",
                    "Human review remains mandatory. No automatic ordering or movement of funds.",
                  ],
                ].map(([title, note]) => (
                  <article className="panel pilot-card" key={title}>
                    <ShieldCheck size={23} />
                    <h2>{title}</h2>
                    <p>{note}</p>
                  </article>
                ))}
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <span className="section-icon">
                    <FlaskConical size={19} />
                  </span>
                  <div>
                    <h2>From model to evidence</h2>
                    <p>Proposed gates for a responsible pilot.</p>
                  </div>
                </div>
                <ol className="pilot-stages">
                  {[
                    [
                      "01",
                      "Prepare & consent",
                      "Confirm SME eligibility, operating constraints, consent, data access and baseline decision tasks.",
                    ],
                    [
                      "02",
                      "Run controlled scenarios",
                      "Compare the existing process with assisted recovery planning using consistent tasks and source freshness checks.",
                    ],
                    [
                      "03",
                      "Review & validate",
                      "Record completion time, constraint compliance, overrides, source gaps and owner acceptance.",
                    ],
                    [
                      "04",
                      "Decide on expansion",
                      "Assess results against predefined measures. Resolve integration, privacy and security gates before any live rollout.",
                    ],
                  ].map(([n, title, note]) => (
                    <li key={n}>
                      <span>{n}</span>
                      <div>
                        <h3>{title}</h3>
                        <p>{note}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="panel-foot">
                  <CircleHelp size={16} />
                  No enrollment, commercial outcome, du API access or production
                  acceptance is claimed.
                </div>
              </section>
            </>
          )}
          <footer className="workspace-footer">
            <span>
              <ShieldCheck size={14} />
              Your decision. Your approval.
            </span>
            <span>Aqion Relay · Synthetic ResilienceTech MVP</span>
            <span><a href="/pitch/" target="_blank" rel="noopener noreferrer">Pitch deck</a> · <a href="https://github.com/Jaferdecodesai/DuIgnyteMVP_Aqionlabs" target="_blank" rel="noopener noreferrer">GitHub</a></span>
          </footer>
        </main>
      </div>
      <dialog
        ref={reviewRef}
        aria-labelledby="review-title"
        onCancel={() => setSelected(null)}
      >
        <div className="dialog-heading">
          <span className="section-icon">
            <ShieldCheck size={22} />
          </span>
          <button
            className="icon-button"
            aria-label="Close review"
            onClick={() => {
              reviewRef.current?.close();
              setSelected(null);
            }}
          >
            <X size={20} />
          </button>
        </div>
        <span className="eyebrow">OWNER REVIEW</span>
        <h2 id="review-title">Review recovery plan</h2>
        {selected && proposal && (
          <>
            <p>
              {selected.label} · {snap.name}
            </p>
            <div className="review-stats">
              <Metric
                label="Operating cash floor"
                value={money(proposal.scenario.cash_floor)}
              />
              <Metric
                label="Projected minimum cash"
                value={money(selected.min_cash)}
              />
              <Metric label="Recovery spend" value={money(selected.spend)} />
            </div>
            <h3>Quantities & fictional supplier terms</h3>
            {selected.orders.map((o) => {
              const supplier = snap.suppliers.find(
                (s) => s.id === o.supplier_id,
              );
              return (
                <div className="review-order" key={o.supplier_id}>
                  <strong>{o.name}</strong>
                  <p>
                    {o.qty} units · arrives Day {o.lead} · {money(o.unit_price)}{" "}
                    / unit · freight {money(o.freight)} · total {money(o.cost)}
                  </p>
                  <small>
                    Cap {supplier?.qty_cap} · MOQ {supplier?.moq} · pack{" "}
                    {supplier?.pack} · terms valid through{" "}
                    {supplier?.valid_until}
                  </small>
                </div>
              );
            })}
            <p className="footnote">
              Source freshness, supplier terms and your cash floor are checked again when you save. Only one unsent draft can be active for this SME.
            </p>
            {(error || expired) && (
              <div className="notice error">
                {error ||
                  "Proposal expired. Close this dialog and run a fresh scenario."}
              </div>
            )}
            <label className="confirm-check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                I reviewed the quantities, supplier terms and cash floor. Create
                an <strong>unsent synthetic draft</strong> only.
              </span>
            </label>
            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => {
                  reviewRef.current?.close();
                  setSelected(null);
                }}
              >
                Back to options
              </button>
              <button
                className="button primary"
                disabled={!confirmed || !canWrite || dirty || expired}
                onClick={save}
              >
                {busy ? "Saving…" : "Create unsent draft"}
                <Check size={17} />
              </button>
            </div>
          </>
        )}
      </dialog>
      <dialog ref={resetRef} aria-labelledby="reset-title">
        <div className="dialog-heading">
          <RefreshCw size={24} />
          <button
            className="icon-button"
            aria-label="Close reset"
            onClick={() => resetRef.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="reset-title">Reset this SME?</h2>
        <p>
          Restore the original fictional snapshot for {snap.name}. Its saved
          scenarios, drafts and recovery timeline will be removed from this
          anonymous workspace.
        </p>
        <div className="dialog-actions">
          <button
            className="button secondary"
            onClick={() => resetRef.current?.close()}
          >
            Keep my workspace
          </button>
          <button
            className="button primary"
            disabled={!canWrite}
            onClick={() =>
              void act(async () => {
                await request("/api/reset", { tenant, confirm: true });
                setProposal(null);
                setDirty(false);
                await load();
                resetRef.current?.close();
                setSuccess("Original fictional fixture restored for this SME.");
              })
            }
          >
            Restore fictional fixture
          </button>
        </div>
      </dialog>
    </div>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path
            d="M7 25 15 9h7l-8 16H7Zm10 0 8-16h4l-8 16h-4Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span>
        Aqion<span className="brand-relay">Relay</span>
        <small>BUSINESS CONTINUITY, SIMPLIFIED</small>
      </span>
    </div>
  );
}
function Range({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="range-field">
      <div>
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>
          {value}
          {suffix}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={
          {
            "--range-fill": `${((value - min) / (max - min)) * 100}%`,
          } as React.CSSProperties
        }
      />
      <div className="range-ends">
        <span>
          {min}
          {suffix}
        </span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
function ProjectionChart({
  baseline,
  recovery,
  measure,
  floor,
}: {
  baseline: DailyRow[];
  recovery: DailyRow[];
  measure: "stock" | "cash";
  floor: number;
}) {
  const values = [...baseline, ...recovery].map((d) => d[measure]);
  if (measure === "cash") values.push(floor);
  const min = Math.min(0, ...values),
    max = Math.max(1, ...values) * 1.08;
  const x = (day: number) => 52 + ((day - 1) / 29) * 534,
    y = (v: number) => 18 + ((max - v) / (max - min)) * 162,
    points = (rows: DailyRow[]) =>
      rows.map((d) => `${x(d.day)},${y(d[measure])}`).join(" ");
  return (
    <svg
      className="projection-chart"
      viewBox="0 0 600 212"
      role="img"
      aria-label={`30-day synthetic ${measure} projection. Exact values available in the daily table.`}
    >
      <title>30-day synthetic {measure} projection</title>
      {[0, 1, 2, 3].map((i) => {
        const v = min + ((max - min) * i) / 3;
        return (
          <g key={i}>
            <line x1="52" x2="586" y1={y(v)} y2={y(v)} stroke="var(--border)" />
            <text x="43" y={y(v) + 4} textAnchor="end">
              {v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}
            </text>
          </g>
        );
      })}
      {[1, 5, 10, 15, 20, 25, 30].map((d) => (
        <text key={d} x={x(d)} y="203" textAnchor="middle">
          {d}
        </text>
      ))}
      {recovery.length > 0 && (
        <polygon
          points={`52,180 ${points(recovery)} 586,180`}
          fill="var(--teal-soft)"
        />
      )}
      {measure === "cash" && (
        <line
          x1="52"
          x2="586"
          y1={y(floor)}
          y2={y(floor)}
          stroke="var(--amber)"
          strokeDasharray="3 4"
        />
      )}
      <polyline
        points={points(baseline)}
        fill="none"
        stroke="var(--chart-baseline)"
        strokeWidth="2"
        strokeDasharray="5 4"
      />
      <polyline
        points={points(recovery)}
        fill="none"
        stroke="var(--teal)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
