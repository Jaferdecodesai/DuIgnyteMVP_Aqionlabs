import { createHash } from "node:crypto";
import type {
  Calculation,
  DailyRow,
  Forecast,
  Order,
  Plan,
  Scenario,
  ScheduledCash,
  Snapshot,
  Supplier,
  TenantId,
} from "./types";
export { fixtures } from "./fixtures";
export type {
  Calculation,
  Forecast,
  Order,
  Plan,
  Scenario,
  Snapshot,
  Supplier,
  TenantId,
} from "./types";
export const SCHEMA_VERSION = "relay.snapshot.v1";
export const FIXTURE_VERSION = "fictional-2026-10-15.v1";
export const MODEL_VERSION = "weekday-trend-ridge.node.v1";
export const CALC_VERSION = "daily-conservative-enumeration.node.v1";
export const HORIZON = 30;
export const MODE =
  "Synthetic demonstration. Fictional SME records and supplier terms. No live du, ERP or supplier connection. Demo drafts are unsent.";
/** Sorted JSON keys, UTF-8, native JSON number/string encoding; Node port replay format. */
function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("digest: finite JSON numbers required");
    return JSON.stringify(value);
  }
  if (typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  throw new Error("digest: JSON values required");
}
export function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${field}: object required`);
  return value as Record<string, unknown>;
}
function safeKeys(value: unknown, depth = 0): void {
  if (depth > 12) throw new Error("snapshot: nesting limit exceeded");
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key))
      throw new Error("snapshot: unsafe object key");
    safeKeys((value as Record<string, unknown>)[key], depth + 1);
  }
}
function number(
  value: unknown,
  field: string,
  low = 0,
  high = 10_000_000,
  integer = false,
): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(
      `${field}: a finite ${integer ? "integer" : "number"} is required`,
    );
  if (value < low || value > high || (integer && !Number.isInteger(value)))
    throw new Error(
      `${field}: accepted range ${low}–${high}${integer ? " integer" : ""}`,
    );
  return value;
}
function text(value: unknown, field: string, limit = 100): string {
  if (typeof value !== "string" || !value.trim() || value.length > limit)
    throw new Error(`${field}: required text, maximum ${limit} characters`);
  return value;
}
function date(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith("0000") ||
    !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  )
    throw new Error(`${field}: use YYYY-MM-DD`);
  return value;
}
function historyValues(value: unknown): number[] {
  if (!Array.isArray(value) || value.length < 7 || value.length > 180)
    throw new Error(
      "history: 7–180 daily fulfilled-sales observations required",
    );
  return value.map((v, i) => number(v, `history[${i}]`, 0, 2000, true));
}
function schedule(value: unknown, field: string): ScheduledCash[] {
  if (!Array.isArray(value) || value.length > 30)
    throw new Error(`${field}: maximum 30 scheduled entries`);
  return value.map((entry, i) => {
    const item = object(entry, `${field}[${i}]`);
    return {
      day: number(item.day, `${field}[${i}].day`, 1, 30, true),
      amount: number(item.amount, `${field}[${i}].amount`),
      label: text(item.label, `${field}[${i}].label`),
    };
  });
}
export function validateSnapshot(value: unknown, tenant: TenantId): Snapshot {
  safeKeys(value);
  const input = object(value, "snapshot");
  if (input.synthetic !== true)
    throw new Error(
      "snapshot.synthetic: true is required; import fictional records only",
    );
  if (
    input.tenant !== tenant ||
    !["packaging", "trading", "homeware"].includes(tenant)
  )
    throw new Error("snapshot.tenant: must match the selected fictional SME");
  const inbound = object(input.inbound, "inbound");
  if (inbound.prepaid !== true)
    throw new Error(
      "inbound.prepaid: true required; fixture assumes existing import is fully prepaid",
    );
  if (
    !Array.isArray(input.suppliers) ||
    input.suppliers.length < 1 ||
    input.suppliers.length > 3
  )
    throw new Error("suppliers: 1–3 fictional suppliers required");
  const ids = new Set<string>();
  const suppliers = input.suppliers.map((entry, i): Supplier => {
    const s = object(entry, `suppliers[${i}]`);
    const id = text(s.id, "supplier.id", 40);
    if (ids.has(id)) throw new Error("supplier.id: duplicate identifier");
    ids.add(id);
    if (typeof s.approved !== "boolean")
      throw new Error("supplier.approved: boolean required");
    return {
      id,
      name: text(s.name, "supplier.name", 80),
      approved: s.approved,
      qty_cap: number(s.qty_cap, "supplier.qty_cap", 0, 2000, true),
      moq: number(s.moq, "supplier.moq", 1, 2000, true),
      pack: number(s.pack, "supplier.pack", 1, 1000, true),
      lead: number(s.lead, "supplier.lead", 1, 30, true),
      price: number(s.price, "supplier.price", 0, 100000),
      freight: number(s.freight, "supplier.freight", 0, 100000),
      valid_until: date(s.valid_until, "supplier.valid_until"),
    };
  });
  return {
    id: text(input.id, "id"),
    tenant,
    name: text(input.name, "name"),
    sector: text(input.sector, "sector"),
    as_of: date(input.as_of, "as_of"),
    age_hours: number(input.age_hours, "age_hours", 0, 8760),
    sku: text(input.sku, "sku"),
    unit: text(input.unit, "unit"),
    stock: number(input.stock, "stock", 0, 2000, true),
    cash: number(input.cash, "cash"),
    cash_floor: number(input.cash_floor, "cash_floor"),
    history: historyValues(input.history),
    synthetic: true,
    inbound: {
      day: number(inbound.day, "inbound.day", 1, 30, true),
      qty: number(inbound.qty, "inbound.qty", 0, 2000, true),
      prepaid: true,
    },
    receipts: schedule(input.receipts, "receipts"),
    obligations: schedule(input.obligations, "obligations"),
    suppliers,
    ...(input.import_revision === undefined
      ? {}
      : { import_revision: text(input.import_revision, "import_revision") }),
  };
}
export function validateScenario(value: unknown): Scenario {
  const s = object(value, "scenario");
  return {
    delay: number(s.delay, "scenario.delay", 0, 21, true),
    demand: number(s.demand, "scenario.demand", 0, 100, true),
    freight: number(s.freight, "scenario.freight", 0, 200, true),
    cash_floor: number(s.cash_floor, "scenario.cash_floor"),
  };
}
/** Python-reference half-even rounding for integer forecasts and sample positions. */
function roundEven(value: number): number {
  const lower = Math.floor(value),
    fraction = value - lower;
  return fraction === 0.5
    ? lower % 2 === 0
      ? lower
      : lower + 1
    : Math.round(value);
}
function cents(value: number): number {
  return roundEven(value * 100) / 100;
}
function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
function features(t: number): number[] {
  return [
    1,
    t / 84,
    ...Array.from({ length: 6 }, (_, day) => Number(t % 7 === day)),
  ];
}
function fit(history: number[]): number[] {
  const x = history.map((_, i) => features(i));
  const a = Array.from({ length: 8 }, (_, i) => [
    ...Array.from(
      { length: 8 },
      (_, j) =>
        x.reduce((total, row) => total + row[i] * row[j], 0) +
        (i === j ? 0.1 : 0),
    ),
    x.reduce((total, row, index) => total + row[i] * history[index], 0),
  ]);
  for (let i = 0; i < 8; i++) {
    let pivot = i;
    for (let j = i + 1; j < 8; j++)
      if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j;
    [a[i], a[pivot]] = [a[pivot], a[i]];
    const divisor = a[i][i];
    a[i] = a[i].map((value) => value / divisor);
    for (let j = 0; j < 8; j++)
      if (j !== i) {
        const factor = a[j][i];
        a[j] = a[j].map((value, k) => value - factor * a[i][k]);
      }
  }
  return a.map((row) => row[8]);
}
function predict(weights: number[], t: number): number {
  return Math.max(
    0,
    Math.min(
      2000,
      features(t).reduce((sum, x, i) => sum + x * weights[i], 0),
    ),
  );
}
export function forecast(history: number[]): Forecast {
  history = historyValues(history);
  if (history.length < 28 || new Set(history).size <= 1)
    return {
      method: "Trailing average fallback · planning assumption",
      series: Array(HORIZON).fill(roundEven(mean(history.slice(-14)))),
      holdout_mae: null,
      baseline_mae: null,
      model_version: MODEL_VERSION,
      uncertainty_note:
        "History is short or constant. No held-out model-quality claim.",
    };
  const train = history.slice(0, -14),
    holdout = history.slice(-14),
    trained = fit(train);
  const modelError = mean(
    holdout.map((y, i) => Math.abs(y - predict(trained, train.length + i))),
  );
  const baselineError = mean(
    holdout.map((y, i) => Math.abs(y - train[train.length - 7 + (i % 7)])),
  );
  const weights = fit(history),
    useNaive = modelError > baselineError;
  return {
    method: useNaive
      ? "Seasonal naive · lower synthetic holdout error"
      : "Fitted weekday + trend ridge regression",
    series: Array.from({ length: HORIZON }, (_, i) =>
      useNaive
        ? history[history.length - 7 + (i % 7)]
        : roundEven(predict(weights, history.length + i)),
    ),
    holdout_mae: cents(modelError),
    baseline_mae: cents(baselineError),
    selected_holdout_mae: cents(Math.min(modelError, baselineError)),
    model_version: MODEL_VERSION,
    training_days: train.length,
    holdout_days: 14,
    uncertainty_note:
      "Holdout error on fictional fulfilled sales. Model selection uses this holdout; it is not an independent final test. Sales can censor true demand. Demand-shock controls are sensitivity assumptions, not a calibrated prediction interval.",
  };
}
export function quantities(supplier: Supplier): number[] {
  const eligible: number[] = [];
  for (let q = supplier.pack; q <= supplier.qty_cap; q += supplier.pack)
    if (q >= supplier.moq) eligible.push(q);
  return [
    0,
    ...(eligible.length > 19
      ? Array.from(
          new Set(
            Array.from(
              { length: 19 },
              (_, i) => eligible[roundEven((i * (eligible.length - 1)) / 18)],
            ),
          ),
        )
      : eligible),
  ];
}
function dailySimulation(
  s: Snapshot,
  scenario: Scenario,
  demand: number[],
  orders: Order[],
  detail = true,
): Omit<Plan, "id" | "label"> {
  const spent = orders.reduce((total, order) => total + order.cost, 0);
  let cash = s.cash - spent,
    minCash = Math.min(s.cash, cash),
    stock = s.stock,
    fulfilled = 0,
    lost = 0,
    stockoutDays = 0;
  const daily: DailyRow[] = [];
  demand.forEach((need, i) => {
    const day = i + 1;
    if (day === s.inbound.day + scenario.delay) stock += s.inbound.qty;
    stock += orders.reduce(
      (total, order) => total + (order.lead === day ? order.qty : 0),
      0,
    );
    cash -= s.obligations.reduce(
      (total, item) => total + (item.day === day ? item.amount : 0),
      0,
    );
    minCash = Math.min(minCash, cash);
    cash += s.receipts.reduce(
      (total, item) => total + (item.day === day ? item.amount : 0),
      0,
    );
    const served = Math.min(stock, need),
      missed = Math.max(0, need - stock);
    stock -= served;
    fulfilled += served;
    lost += missed;
    stockoutDays += Number(missed > 0);
    if (detail)
      daily.push({
        day,
        demand: need,
        stock,
        cash: cents(cash),
        fulfilled: served,
        lost: missed,
      });
  });
  const money = (value: number) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const reasons =
    minCash < scenario.cash_floor - 0.001
      ? [
          `Projected minimum cash AED ${money(minCash)} is below floor AED ${money(scenario.cash_floor)}`,
        ]
      : [];
  return {
    orders,
    spend: cents(spent),
    fulfilled,
    lost,
    stockout_days: stockoutDays,
    min_cash: cents(minCash),
    feasible: !reasons.length,
    reasons,
    daily,
  };
}
export function calculate(snapshot: Snapshot, scenario: Scenario): Calculation {
  const s = validateSnapshot(snapshot, snapshot.tenant);
  scenario = validateScenario(scenario);
  const f = forecast(s.history),
    demand = f.series.map((x) => roundEven(x * (1 + scenario.demand / 100)));
  const baseline: Plan = {
    ...dailySimulation(s, scenario, demand, []),
    id: "baseline",
    label: "No recovery purchase",
  };
  const blocked =
    s.age_hours > 24
      ? [
          "Snapshot older than 24 fictional hours — update the fictional snapshot and rerun",
        ]
      : [];
  const excluded: Calculation["excluded_suppliers"] = [],
    candidates: Supplier[] = [];
  for (const supplier of s.suppliers) {
    if (!supplier.approved)
      excluded.push({
        id: supplier.id,
        reason: "Not on the fictional approved supplier list",
      });
    else if (supplier.valid_until < s.as_of)
      excluded.push({
        id: supplier.id,
        reason: "Supplier quote expired — update fictional terms and rerun",
      });
    else candidates.push(supplier);
  }
  const ranked: Plan[] = [];
  function enumerate(index: number, orders: Order[]): void {
    if (index === candidates.length) {
      if (orders.length)
        ranked.push({
          ...dailySimulation(s, scenario, demand, orders, false),
          id: `plan-${digest(orders).slice(0, 10)}`,
          label: orders
            .map((o) => `${o.qty} from ${o.name.split(" ·")[0]}`)
            .join(" + "),
        });
      return;
    }
    const supplier = candidates[index];
    for (const qty of quantities(supplier)) {
      const freight = cents(supplier.freight * (1 + scenario.freight / 100));
      enumerate(
        index + 1,
        qty
          ? [
              ...orders,
              {
                supplier_id: supplier.id,
                name: supplier.name,
                qty,
                lead: supplier.lead,
                unit_price: supplier.price,
                freight,
                cost: cents(qty * supplier.price + freight),
              },
            ]
          : orders,
      );
    }
  }
  enumerate(0, []);
  const byImpact = (a: Plan, b: Plan) => a.lost - b.lost || a.spend - b.spend;
  ranked.sort(
    (a, b) => Number(!a.feasible) - Number(!b.feasible) || byImpact(a, b),
  );
  const recommended = ranked.find((p) => p.feasible && p.lost < baseline.lost);
  const cheapest = ranked.reduce<Plan | undefined>(
    (best, p) => (!best || p.spend < best.spend ? p : best),
    undefined,
  );
  const bestImpact = ranked.reduce<Plan | undefined>(
    (best, p) => (!best || byImpact(p, best) < 0 ? p : best),
    undefined,
  );
  const selected: Plan[] = [];
  for (const plan of [
    recommended,
    cheapest,
    bestImpact,
    ranked.find((p) => !p.feasible),
    ...ranked,
  ]) {
    if (plan && !selected.some((p) => p.id === plan.id))
      selected.push({
        ...dailySimulation(s, scenario, demand, plan.orders),
        id: plan.id,
        label: plan.label,
      });
    if (selected.length === 4) break;
  }
  return {
    tenant: s.tenant,
    version: digest(s),
    scenario,
    forecast: f,
    baseline,
    plans: selected,
    recommended_id: recommended && !blocked.length ? recommended.id : null,
    evaluated: ranked.length + 1,
    excluded_suppliers: excluded,
    blocked,
    synthetic: true,
    calc_version: CALC_VERSION,
    input_hash: digest({
      snapshot: s,
      scenario,
      calc: CALC_VERSION,
      model: MODEL_VERSION,
    }),
    assumptions: [
      "Single SKU; 30-day horizon; projected under selected assumptions.",
      "All recovery stock and freight paid on day 1; supplier prices are VAT-inclusive fictional terms.",
      "Existing import fully prepaid. Only scheduled existing receivables add cash; recovered sales generate no receipts in this horizon.",
      "Daily cash floor includes opening cash and obligations before same-day receipts.",
      "Unfilled units are lost sales, not backlog. Goods arrive at start of lead-time day; no quality or supplier verification.",
      "Highest-ranked feasible option among evaluated combinations; bounded enumeration, not guaranteed global optimum.",
    ],
  };
}
