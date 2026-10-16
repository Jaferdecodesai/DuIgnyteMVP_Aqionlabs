import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SqliteStore, encodeDocument } from "../src/lib/storage";

let directory: string;
let store: SqliteStore<{ count: number }>;
async function fresh() {
  directory = await mkdtemp(path.join(tmpdir(), "relay-node-"));
  store = new SqliteStore(path.join(directory, "test.sqlite"));
  return store;
}
afterEach(async () => {
  await store?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});
describe("persistent workspace transactions", () => {
  it("reserves native SQL row overhead below a two MiB row ceiling", () => {
    expect(() => encodeDocument({ padding: "x".repeat(1_600_000) })).toThrow(/limit/i);
  });
  it("persists committed state after reopen", async () => {
    const s = await fresh();
    await s.transact(
      "a",
      () => ({ count: 0 }),
      (d) => {
        d.count = 7;
        return d.count;
      },
    );
    await s.close();
    store = new SqliteStore(path.join(directory, "test.sqlite"));
    expect(await store.read("a")).toEqual({ count: 7 });
  });
  it("rolls back a failed state transition", async () => {
    const s = await fresh();
    await s.transact(
      "a",
      () => ({ count: 1 }),
      () => true,
    );
    await expect(
      s.transact("a", undefined, (d) => {
        d.count = 9;
        throw new Error("failure");
      }),
    ).rejects.toThrow("failure");
    expect(await s.read("a")).toEqual({ count: 1 });
  });
  it("serializes concurrent changes without lost updates", async () => {
    const s = await fresh();
    await s.transact(
      "a",
      () => ({ count: 0 }),
      () => true,
    );
    await Promise.all(
      Array.from({ length: 20 }, () =>
        s.transact("a", undefined, (d) => ++d.count),
      ),
    );
    expect(await s.read("a")).toEqual({ count: 20 });
  });
  it("isolates workspaces and refuses missing reads", async () => {
    const s = await fresh();
    await s.transact(
      "a",
      () => ({ count: 1 }),
      () => true,
    );
    expect(await s.read("b")).toBeUndefined();
    await expect(s.transact("b", undefined, (d) => d.count)).rejects.toThrow(
      /workspace/i,
    );
    expect(await s.read("a")).toEqual({ count: 1 });
  });
  it("rejects oversized documents without replacing existing state", async () => {
    const s = await fresh();
    await s.transact(
      "a",
      () => ({ count: 1 }),
      () => true,
    );
    await expect(
      s.transact("a", undefined, (d) => {
        Object.assign(d, { padding: "x".repeat(2 * 1024 * 1024) });
        return true;
      }),
    ).rejects.toThrow(/limit/i);
    expect(await s.read("a")).toEqual({ count: 1 });
  });
  it("reports readiness after schema initialization", async () => {
    const s = await fresh();
    await expect(s.ready()).resolves.toBe(true);
  });
});
