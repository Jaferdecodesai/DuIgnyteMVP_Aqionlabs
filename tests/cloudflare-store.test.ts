import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { DurableSqliteStore, type DurableStoragePort } from "../src/cloudflare/store";
import { RelayWorkspace } from "../src/cloudflare/worker";
const databases: DatabaseSync[] = [];
function adapter() {
 const db = new DatabaseSync(":memory:"); databases.push(db);
 let transactions = 0;
 const port: DurableStoragePort = {
  sql: { exec<T>(query: string, ...args: (string | number | null)[]) {
   const statement = db.prepare(query);
   const rows = statement.columns().length ? statement.all(...args) : (statement.run(...args), []);
   return { toArray: () => rows as T[] };
  } },
  transactionSync<T>(fn: () => T): T { transactions++; db.exec("BEGIN IMMEDIATE"); try { const result = fn(); db.exec("COMMIT"); return result; } catch (error) { db.exec("ROLLBACK"); throw error; } },
 };
 return { db, port, store: new DurableSqliteStore<{ count: number; audit: string[] }>(port), transactions: () => transactions };
}
afterEach(() => { databases.splice(0).forEach(db => db.close()); vi.restoreAllMocks(); });
describe("Cloudflare native SQLite document transactions", () => {
 it("persists and isolates workspaces across store instances", async () => {
  const a = adapter();
  await a.store.transact("one", () => ({ count: 0, audit: [] }), s => { s.count++; s.audit.push("created"); });
  expect(await a.store.read("other")).toBeUndefined();
  expect(await new DurableSqliteStore(a.port).read("one")).toEqual({ count: 1, audit: ["created"] });
  expect(await a.store.ready()).toBe(true);
 });
 it("runs reads, domain checks and writes in one synchronous transaction", async () => {
  const a = adapter();
  await a.store.transact("one", () => ({ count: 0, audit: [] }), s => { s.count = 4; });
  const before = a.transactions();
  await a.store.transact("one", undefined, s => { s.count++; s.audit.push("approved"); });
  expect(a.transactions() - before).toBe(1);
  expect(await a.store.read("one")).toEqual({ count: 5, audit: ["approved"] });
 });
 it("rolls back changes and audit if domain mutation fails", async () => {
  const a = adapter(); await a.store.transact("one", () => ({ count: 0, audit: [] }), () => {});
  await expect(a.store.transact("one", undefined, s => { s.count = 99; s.audit.push("bad"); throw new Error("Rejected"); })).rejects.toThrow("Rejected");
  expect(await a.store.read("one")).toEqual({ count: 0, audit: [] });
 });
 it("rejects unknown workspace mutations without creating a record", async () => {
  const a = adapter(); await expect(a.store.transact("missing", undefined, () => {})).rejects.toMatchObject({ status: 401 });
  expect(await a.store.read("missing")).toBeUndefined();
 });
 it("rolls back oversized documents before any persisted write", async () => {
  const a = adapter(); await a.store.transact("one", () => ({ count: 0, audit: [] }), () => {});
  await expect(a.store.transact("one", undefined, s => { s.audit.push("x".repeat(1600000)); })).rejects.toMatchObject({ status: 413 });
  expect((await a.store.read("one"))?.audit).toEqual([]);
 });
 it("caps anonymous workspaces at200 and prunes only expired records during creation", async () => {
  const a = adapter();
  for(let i=0;i<200;i++) await a.store.transact(`w${i}`, () => ({count:0,audit:[]}), () => {});
  await expect(a.store.transact("overflow", () => ({count:0,audit:[]}), () => {})).rejects.toMatchObject({status:503});
  a.db.prepare("UPDATE relay_workspaces SET updated_at=? WHERE workspace_key=?").run(Date.now()-8*86400000,"w0");
  await a.store.read("w1"); expect(await a.store.read("w0")).toBeDefined();
  await a.store.transact("next", () => ({count:0,audit:[]}), () => {});
  expect(await a.store.read("w0")).toBeUndefined();
  expect(await a.store.read("w1")).toBeDefined();
 });
});

it("retains one approved draft under simultaneous requests through the real API handler", async () => {
 const a = adapter(), origin = "https://relay.example";
 const coordinator = new RelayWorkspace({storage:a.port}, {APP_ORIGIN:origin,SESSION_SECRET:"test-only-stable-secret-0123456789abcdef"});
 const first = await coordinator.fetch(new Request(origin+"/api/state", {headers:{host:"relay.example"}}));
 expect(first.status).toBe(200);
 const initial = await first.json() as {csrf:string};
 const cookie = first.headers.get("Set-Cookie")!.split(";")[0];
 const post = (action:string,input:unknown) => coordinator.fetch(new Request(origin+"/api/"+action,{method:"POST",headers:{host:"relay.example",origin,cookie,"Content-Type":"application/json","X-Relay-CSRF":initial.csrf},body:JSON.stringify(input)}));
 const modeled = await post("simulate", {tenant:"packaging",scenario:{delay:7,demand:20,freight:25,cash_floor:24000}});
 expect(modeled.status).toBe(200);
 const proposal = await modeled.json() as {id:string; recommended_id:string};
 const body = {tenant:"packaging",proposal_id:proposal.id,plan_id:proposal.recommended_id,confirm:true};
 const responses = await Promise.all([post("approve",body),post("approve",body)]);
 expect(responses.map(r=>r.status)).toEqual([200,200]);
 const approvals = await Promise.all(responses.map(r=>r.json())) as {duplicate:boolean;draft:{id:string}}[];
 expect(approvals.filter(r=>r.duplicate)).toHaveLength(1);
 expect(new Set(approvals.map(r=>r.draft.id)).size).toBe(1);
 const restored = new RelayWorkspace({storage:a.port},{APP_ORIGIN:origin,SESSION_SECRET:"test-only-stable-secret-0123456789abcdef"});
 const state = await restored.fetch(new Request(origin+"/api/state",{headers:{host:"relay.example",cookie}}));
 const saved = await state.json() as {drafts:unknown[]; audit:{event:string}[];storage:string};
 expect(saved.drafts).toHaveLength(1); expect(saved.storage).toBe("durable-sqlite");
 expect(saved.audit.filter(e=>e.event==="local_draft_created")).toHaveLength(1);
});
