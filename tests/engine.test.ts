import { describe, expect, it } from "vitest";
import {
  calculate,
  digest,
  forecast,
  validateScenario,
  validateSnapshot,
  quantities,
} from "../src/lib/engine";
import { fixtures } from "../src/lib/fixtures";
import type { Scenario } from "../src/lib/types";
const scenario: Scenario = {
  delay: 7,
  demand: 20,
  freight: 25,
  cash_floor: 24000,
};
describe("canonical numerical engine", () => {
  it("hashes nested key ordering reproducibly using SHA256", () => {
    expect(digest({ z: 1, a: { y: 2, x: 3 } })).toMatch(/^[a-f0-9]{64}$/);
    expect(digest({ a: { x: 3, y: 2 }, z: 1 })).toBe(
      digest({ z: 1, a: { y: 2, x: 3 } }),
    );
  });
  it("validates snapshots by value without modifying input", () => {
    const input = fixtures().packaging;
    const output = validateSnapshot(input, "packaging");
    expect(output).toEqual(input);
    expect(output).not.toBe(input);
    expect(validateScenario(scenario)).toEqual(scenario);
  });
  it("fits weekday trend regression with chronological holdout", () => {
    const f = forecast(fixtures().packaging.history);
    expect(f.holdout_mae).toBe(1.28);
    expect(f.baseline_mae).toBe(2.07);
    expect(f.training_days).toBe(70);
    expect(f.holdout_days).toBe(14);
    expect(f.series).toHaveLength(30);
    expect(f.method).toContain("Fitted weekday");
  });
  it("reproduces the fictional packaging recovery and conserved inventory", () => {
    const r = calculate(fixtures().packaging, scenario);
    const p = r.plans.find((plan) => plan.id === r.recommended_id)!;
    expect(r.baseline.fulfilled).toBe(990);
    expect(r.baseline.lost).toBe(372);
    expect(r.baseline.stockout_days).toBe(9);
    expect(r.evaluated).toBe(130);
    expect(p.fulfilled).toBe(1362);
    expect(p.lost).toBe(0);
    expect(p.spend).toBe(7887.5);
    expect(p.min_cash).toBe(28112.5);
    expect(p.orders).toHaveLength(1);
    expect(p.orders[0]).toMatchObject({ supplier_id: "local-bulk", qty: 400 });
    for (const row of p.daily) {
      expect(row.stock).toBeGreaterThanOrEqual(0);
      expect(row.fulfilled + row.lost).toBe(row.demand);
    }
    expect(
      180 + 850 + p.orders.reduce((sum, order) => sum + order.qty, 0),
    ).toBe(p.fulfilled + p.daily[29].stock);
  });
  it("limits each supplier to twenty including zero quantity", () => {
    const supplier = {
      ...fixtures().packaging.suppliers[0],
      pack: 1,
      moq: 1,
      qty_cap: 2000,
    };
    const result = quantities(supplier);
    expect(result).toHaveLength(20);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(1);
    expect(result[19]).toBe(2000);
  });
  it.each([NaN, Infinity, undefined, () => 1])(
    "rejects a non JSON digest value %s",
    (value) => {
      expect(() => digest(value)).toThrow(/finite|JSON/);
    },
  );
  it("retains literal text safely while rejecting dangerous unknown object keys", () => {
    const s = fixtures().packaging;
    s.name = "<img src=x onerror=alert(1)>";
    expect(validateSnapshot(s, "packaging").name).toBe(s.name);
    expect(() =>
      validateSnapshot(
        JSON.parse('{"synthetic":true,"__proto__":{}}'),
        "packaging",
      ),
    ).toThrow(/key/);
  });
  it.each([
    ["synthetic", false, /synthetic/],
    ["tenant", "trading", /tenant/],
    ["cash", NaN, /cash.*finite/],
    ["cash", true, /cash.*finite/],
    ["cash", 10000001, /cash.*range/],
    ["stock", -1, /stock.*range/],
    ["stock", 1.5, /stock.*integer/],
    ["name", "", /name.*text/],
    ["name", "x".repeat(101), /name.*maximum/],
    ["as_of", "2026-02-30", /YYYY-MM-DD/],
    ["as_of", "bad", /YYYY-MM-DD/],
    ["age_hours", 8761, /age_hours/],
    ["history", Array(181).fill(1), /history/],
    ["history", [1], /history/],
    ["suppliers", [], /suppliers/],
    ["suppliers", [null], /suppliers/],
    ["receipts", Array(31).fill({}), /receipts/],
    ["obligations", [null], /obligations/],
    ["inbound", { day: 1, qty: 10, prepaid: false }, /prepaid/],
  ])("rejects invalid snapshot %s", (field, value, error) => {
    expect(() =>
      validateSnapshot(
        { ...fixtures().packaging, [field]: value },
        "packaging",
      ),
    ).toThrow(error);
  });
  it("rejects duplicate, malformed, and out of range supplier terms", () => {
    const s = fixtures().packaging;
    s.suppliers[1].id = s.suppliers[0].id;
    expect(() => validateSnapshot(s, "packaging")).toThrow(/duplicate/);
    s.suppliers[1].id = "other";
    s.suppliers[0].pack = 0;
    expect(() => validateSnapshot(s, "packaging")).toThrow(/supplier.pack/);
    s.suppliers[0].pack = 20;
    (s.suppliers[0] as unknown as Record<string, unknown>).approved = 1;
    expect(() => validateSnapshot(s, "packaging")).toThrow(/boolean/);
  });
  it.each([
    null,
    [],
    true,
    { ...scenario, delay: 22 },
    { ...scenario, demand: 0.5 },
    { ...scenario, cash_floor: NaN },
  ])("rejects invalid scenario %s", (input) => {
    expect(() => validateScenario(input)).toThrow(/scenario/);
  });
  it("labels fallback forecasts without held out quality claims", () => {
    for (const history of [
      [1, 2, 3, 4, 5, 6, 7],
      Array(84).fill(0),
      Array(84).fill(8),
    ]) {
      const f = forecast(history);
      expect(f.method).toContain("fallback");
      expect(f.holdout_mae).toBeNull();
      expect(f.series).toHaveLength(30);
      expect(f.series.every((x) => x >= 0)).toBe(true);
    }
  });
  it("selects seasonal naive when it has lower fixed origin holdout error", () => {
    const history = Array.from({ length: 84 }, (_, i) => 20 + (i % 7) * 10);
    const f = forecast(history);
    expect(f.method).toContain("Seasonal naive");
    expect(f.baseline_mae).toBe(0);
    expect(f.series).toEqual(
      Array.from({ length: 30 }, (_, i) => history[77 + (i % 7)]),
    );
  });
  it("validates direct forecast history before fitting", () => {
    expect(() => forecast([])).toThrow(/history/);
    expect(() => forecast([1, 2, 3, 4, 5, 6, Infinity])).toThrow(/finite/);
  });
  it("does not hide intraday minimum behind later same day receipts", () => {
    const s = fixtures().packaging;
    s.cash = 100;
    s.obligations = [{ day: 1, amount: 150, label: "Earlier payment" }];
    s.receipts = [{ day: 1, amount: 1000, label: "Later receipt" }];
    const r = calculate(s, { ...scenario, cash_floor: 0 });
    expect(r.baseline.min_cash).toBe(-50);
    expect(r.baseline.daily[0].cash).toBe(950);
    expect(r.baseline.feasible).toBe(false);
    expect(r.recommended_id).toBeNull();
  });
  it("excludes unapproved and expired terms and preserves explicit reasons", () => {
    const s = fixtures().packaging;
    s.suppliers[1].valid_until = "2026-10-14";
    const r = calculate(s, scenario);
    expect(r.excluded_suppliers).toHaveLength(2);
    expect(
      r.plans
        .flatMap((p) => p.orders)
        .every((o) => o.supplier_id === "local-fast"),
    ).toBe(true);
  });
  it("blocks stale recommendations while retaining modeled alternatives", () => {
    const s = fixtures().packaging;
    s.age_hours = 25;
    const r = calculate(s, scenario);
    expect(r.recommended_id).toBeNull();
    expect(r.blocked).toHaveLength(1);
    expect(r.baseline.daily).toHaveLength(30);
    expect(r.plans.length).toBeGreaterThan(0);
  });
  it("never recommends purchase if baseline already serves demand", () => {
    const s = fixtures().packaging;
    s.stock = 2000;
    expect(calculate(s, scenario).recommended_id).toBeNull();
  });
  it("returns baseline only when no suppliers qualify or MOQ exceeds cap", () => {
    const s = fixtures().packaging;
    s.suppliers.forEach((x) => {
      x.approved = false;
    });
    expect(calculate(s, scenario)).toMatchObject({
      plans: [],
      recommended_id: null,
      evaluated: 1,
    });
    s.suppliers[0].approved = true;
    s.suppliers[0].qty_cap = 20;
    expect(calculate(s, scenario).plans).toHaveLength(0);
  });
  it("bounds the full three supplier search and enforces cash/inventory invariants", () => {
    const s = fixtures().packaging;
    s.suppliers.forEach((x) => {
      x.approved = true;
      x.pack = 1;
      x.moq = 1;
      x.qty_cap = 2000;
    });
    const started = performance.now();
    const r = calculate(s, scenario);
    expect(r.evaluated).toBe(8000);
    expect(performance.now() - started).toBeLessThan(2000);
    for (const p of [r.baseline, ...r.plans]) {
      expect(p.daily[29].cash).toBe(s.cash + 33000 - 24000 - p.spend);
      expect(p.spend).toBe(p.orders.reduce((sum, o) => sum + o.cost, 0));
      expect(p.feasible).toBe(p.min_cash >= scenario.cash_floor);
      for (const o of p.orders) {
        const supplier = s.suppliers.find((x) => x.id === o.supplier_id)!;
        expect(o.qty % supplier.pack).toBe(0);
        expect(o.qty).toBeGreaterThanOrEqual(supplier.moq);
        expect(o.qty).toBeLessThanOrEqual(supplier.qty_cap);
        expect(o.freight).toBe(supplier.freight * 1.25);
      }
    }
  });
});
