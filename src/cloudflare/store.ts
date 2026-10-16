import { ApiError } from "../lib/security";
import { encodeDocument, type DocumentStore } from "../lib/storage-contract";

/** The small native Durable Object API surface used by this adapter. */
export interface SqlPort {
  exec<T = Record<string, unknown>>(
    query: string,
    ...bindings: (string | number | null)[]
  ): { toArray(): T[] };
}
export interface DurableStoragePort {
  sql: SqlPort;
  transactionSync<T>(callback: () => T): T;
}

/** A single demo coordinator owns at most 200 anonymous workspace documents. */
export class DurableSqliteStore<T> implements DocumentStore<T> {
  constructor(private readonly storage: DurableStoragePort) {
    storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS relay_workspaces (workspace_key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL)",
    );
  }
  async read(key: string): Promise<T | undefined> {
    const row = this.storage.sql.exec<{ payload: string }>(
      "SELECT payload FROM relay_workspaces WHERE workspace_key=?", key,
    ).toArray()[0];
    return row ? JSON.parse(row.payload) as T : undefined;
  }
  async transact<R>(
    key: string,
    seed: (() => T) | undefined,
    fn: (state: T) => R,
  ): Promise<R> {
    // No awaits or SQL transaction statements belong inside this native callback.
    // Version checks, domain mutation, audit and encoded write commit together.
    return this.storage.transactionSync(() => {
      const row = this.storage.sql.exec<{ payload: string }>(
        "SELECT payload FROM relay_workspaces WHERE workspace_key=?", key,
      ).toArray()[0];
      if (!row && !seed)
        throw new ApiError("Demo workspace expired. Reload to initialize a new one.", 401);
      if (!row) {
        this.storage.sql.exec("DELETE FROM relay_workspaces WHERE updated_at<?", Date.now() - 7 * 86400_000);
        const count = this.storage.sql.exec<{ total: number }>("SELECT count(*) AS total FROM relay_workspaces").toArray()[0];
        if (count.total >= 200)
          throw new ApiError("Demo workspace capacity reached. Please try again later.", 503);
      }
      const state = row ? JSON.parse(row.payload) as T : seed!();
      const result = fn(state);
      if (result && typeof (result as { then?: unknown }).then === "function")
        throw new ApiError("Workspace transaction requires a synchronous operation.", 503);
      const payload = encodeDocument(state);
      this.storage.sql.exec(
        "INSERT INTO relay_workspaces VALUES(?,?,?) ON CONFLICT(workspace_key) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at",
        key, payload, Date.now(),
      );
      return result;
    });
  }
  async ready(): Promise<boolean> {
    this.storage.sql.exec("SELECT 1").toArray();
    return true;
  }
  async close(): Promise<void> {
    // The Durable Object runtime owns this database connection.
  }
}
