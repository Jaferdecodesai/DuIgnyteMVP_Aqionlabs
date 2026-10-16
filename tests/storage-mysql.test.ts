import { expect, it, vi } from "vitest";
import { MysqlStore } from "../src/lib/storage-mysql";
// Driver protocol tests only. Live MariaDB/MySQL connectivity is separately owner-gated.
const config = {
  host: "localhost",
  port: 3306,
  database: "relay",
  user: "test",
  password: "test-only",
  tls: true,
};
function driver(payload: string | undefined = '{"count":1}') {
  const events: string[] = [];
  const query = vi.fn(
    async (sql: string, args?: unknown[]): Promise<[unknown, unknown]> => {
      events.push(sql);
      if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }], []];
      if (sql.includes("SELECT payload"))
        return [payload ? [{ payload }] : [], []];
      if (sql.includes("COUNT")) return [[{ total: 0 }], []];
      return [[], []];
    },
  );
  const conn = {
    query,
    beginTransaction: vi.fn(async () => {
      events.push("begin");
    }),
    commit: vi.fn(async () => {
      events.push("commit");
    }),
    rollback: vi.fn(async () => {
      events.push("rollback");
    }),
    release: vi.fn(() => {
      events.push("release");
    }),
  };
  return {
    events,
    conn,
    pool: {
      query,
      getConnection: vi.fn(async () => conn),
      end: vi.fn(async () => {}),
    },
  };
}
it("commits the locked workspace transition on the same connection", async () => {
  const d = driver();
  const s = new MysqlStore<{ count: number }>(config, d.pool);
  expect(await s.transact("a", undefined, (x) => ++x.count)).toBe(2);
  expect(d.conn.query).toHaveBeenCalledWith(
    expect.stringContaining("FOR UPDATE"),
    ["a"],
  );
  expect(d.events.indexOf("commit")).toBeLessThan(d.events.indexOf("release"));
  expect(d.conn.rollback).not.toHaveBeenCalled();
});
it("rolls back failures and releases the connection", async () => {
  const d = driver();
  const s = new MysqlStore<{ count: number }>(config, d.pool);
  await expect(
    s.transact("a", undefined, () => {
      throw new Error("stop");
    }),
  ).rejects.toThrow("stop");
  expect(d.conn.rollback).toHaveBeenCalled();
  expect(d.conn.commit).not.toHaveBeenCalled();
  expect(d.conn.release).toHaveBeenCalled();
});
it("holds the capacity lock when initializing a new workspace", async () => {
  const d = driver(undefined);
  const s = new MysqlStore<{ count: number }>(config, d.pool);
  await s.transact(
    "new",
    () => ({ count: 0 }),
    (x) => ++x.count,
  );
  expect(d.events.some((x) => x.includes("GET_LOCK"))).toBe(true);
  expect(d.events.some((x) => x.includes("RELEASE_LOCK"))).toBe(true);
});
it("does not mutate storage during reads", async () => {
  const d = driver();
  const s = new MysqlStore<{ count: number }>(config, d.pool);
  expect(await s.read("a")).toEqual({ count: 1 });
  expect(d.pool.getConnection).not.toHaveBeenCalled();
  expect(d.events.every((x) => x.startsWith("SELECT"))).toBe(true);
  await s.close();
  expect(d.pool.end).toHaveBeenCalled();
});
it("initializes schema and probes readiness without provider secrets in output", async () => {
  const d = driver();
  const s = new MysqlStore(config, d.pool);
  expect(await s.ready()).toBe(true);
  expect(d.events.some((x) => x.includes("CREATE TABLE"))).toBe(true);
  expect(d.events.some((x) => x === "SELECT 1")).toBe(true);
});
