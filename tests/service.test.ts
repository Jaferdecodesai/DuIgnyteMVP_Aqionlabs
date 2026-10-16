import { beforeEach, afterEach, expect, it } from "vitest";
import { SqliteStore } from "../src/lib/storage";
import { RelayService, type Workspace } from "../src/lib/service";
import { fixtures } from "../src/lib/engine";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
let db: SqliteStore<Workspace>, service: RelayService, dir: string;
const scenario = { delay: 7, demand: 20, freight: 25, cash_floor: 24000 };
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "relay-service-"));
  db = new SqliteStore(path.join(dir, "state.sqlite"));
  service = new RelayService(db);
  await service.initialize("a");
  await service.initialize("b");
});
afterEach(async () => {
  await db.close();
  await rm(dir, { recursive: true, force: true });
});
it("creates an independent fictional workspace", async () => {
  expect((await service.state("a", "packaging")).snapshot.stock).toBe(180);
  expect((await service.state("b", "trading")).drafts).toEqual([]);
});
it("makes duplicate concurrent approvals idempotent", async () => {
  const p = await service.simulate("a", "packaging", scenario);
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      service.approve("a", "packaging", p.id, p.recommended_id!, true),
    ),
  );
  expect(new Set(results.map((r) => r.draft.id)).size).toBe(1);
  expect(
    (await service.state("a", "packaging")).audit.filter(
      (e) => e.event === "local_draft_created",
    ),
  ).toHaveLength(1);
});
it("rejects cross-workspace proposal and draft identifiers", async () => {
  const p = await service.simulate("a", "packaging", scenario);
  await expect(
    service.approve("b", "packaging", p.id, p.recommended_id!, true),
  ).rejects.toThrow(/Proposal/);
  const d = await service.approve(
    "a",
    "packaging",
    p.id,
    p.recommended_id!,
    true,
  );
  await expect(service.cancel("b", "packaging", d.draft.id)).rejects.toThrow(
    /not found/,
  );
  expect((await service.export("b", "packaging")).drafts).toEqual([]);
});
it("prevents different proposals reusing reserved cash", async () => {
  const p = await service.simulate("a", "packaging", scenario),
    q = await service.simulate("a", "packaging", scenario);
  await service.approve("a", "packaging", p.id, p.recommended_id!, true);
  await expect(
    service.approve("a", "packaging", q.id, q.recommended_id!, true),
  ).rejects.toThrow(/outstanding/);
});
it("keeps a canceled duplicate canceled", async () => {
  const p = await service.simulate("a", "packaging", scenario);
  const d = await service.approve(
    "a",
    "packaging",
    p.id,
    p.recommended_id!,
    true,
  );
  await service.cancel("a", "packaging", d.draft.id);
  const repeat = await service.approve(
    "a",
    "packaging",
    p.id,
    p.recommended_id!,
    true,
  );
  expect(repeat.duplicate).toBe(true);
  expect(repeat.draft.status).toBe("canceled_local");
});
it("invalidates old source versions on import", async () => {
  const p = await service.simulate("a", "packaging", scenario);
  await service.importSnapshot("a", "packaging", fixtures().packaging);
  await expect(
    service.approve("a", "packaging", p.id, p.recommended_id!, true),
  ).rejects.toThrow(/Snapshot changed/);
});
it("keeps invalid imports atomic", async () => {
  const before = await service.state("a", "packaging");
  await expect(
    service.importSnapshot("a", "packaging", { ...before.snapshot, stock: -1 }),
  ).rejects.toThrow(/stock/);
  expect(await service.state("a", "packaging")).toEqual(before);
});
it("enforces confirmation and rejects fabricated plans", async () => {
  const p = await service.simulate("a", "packaging", scenario);
  await expect(
    service.approve("a", "packaging", p.id, p.recommended_id!, false),
  ).rejects.toThrow(/Confirm/);
  await expect(
    service.approve("a", "packaging", p.id, "invented", true),
  ).rejects.toThrow(/constraints/);
});
it("expires an unapproved proposal after thirty minutes", async () => {
  const p = await service.simulate("a", "packaging", scenario);
  const later = new RelayService(db, { now: () => p.created_at + 1801 });
  await expect(
    later.approve("a", "packaging", p.id, p.recommended_id!, true),
  ).rejects.toThrow(/expired/);
});
it("exports replay inputs without session security material", async () => {
  await service.simulate("a", "packaging", scenario);
  const e = await service.export("a", "packaging");
  expect(e.synthetic).toBe(true);
  expect(e.proposals[0].snapshot.tenant).toBe("packaging");
  expect(JSON.stringify(e)).not.toMatch(/csrf|session_secret/i);
});
it("resets only the chosen tenant and requires confirmation", async () => {
  await service.simulate("a", "packaging", scenario);
  await expect(service.reset("a", "packaging", false)).rejects.toThrow(
    /Confirm/,
  );
  await service.reset("a", "trading", true);
  expect((await service.export("a", "packaging")).proposals).toHaveLength(1);
  await service.reset("a", "packaging", true);
  expect((await service.export("a", "packaging")).proposals).toHaveLength(0);
});
it("write-disable allows stateless calculation but no storage mutations", async () => {
  const paused = new RelayService(db, { writesEnabled: false });
  await expect(paused.initialize("new")).rejects.toThrow(/paused/);
  const before = await db.read("a");
  const p = await paused.simulate("a", "packaging", scenario);
  expect(p.recommended_id).toBeTruthy();
  await expect(
    paused.approve("a", "packaging", p.id, p.recommended_id!, true),
  ).rejects.toThrow(/paused/);
  expect(await db.read("a")).toEqual(before);
});
it("rejects unsupported tenant identifiers", async () => {
  await expect(service.state("a", "constructor")).rejects.toThrow(/SME/);
});
