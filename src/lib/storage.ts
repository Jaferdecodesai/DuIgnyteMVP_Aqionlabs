import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { ApiError } from "./security";

import { encodeDocument, type DocumentStore } from "./storage-contract";
export { encodeDocument, MAX_DOCUMENT_BYTES } from "./storage-contract";
export type { DocumentStore } from "./storage-contract";

export class SqliteStore<T> implements DocumentStore<T> {
  private db: DatabaseSync;
  private tail: Promise<unknown> = Promise.resolve();
  private closed = false;
  constructor(file: string) {
    mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS relay_workspaces (workspace_key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL)",
    );
  }
  private exclusive<R>(fn: () => R): Promise<R> {
    const result = this.tail.then(fn);
    this.tail = result.catch(() => {});
    return result;
  }
  async read(key: string): Promise<T | undefined> {
    return this.exclusive(() => {
      const row = this.db
        .prepare("SELECT payload FROM relay_workspaces WHERE workspace_key=?")
        .get(key) as { payload: string } | undefined;
      return row ? (JSON.parse(row.payload) as T) : undefined;
    });
  }
  async transact<R>(
    key: string,
    seed: (() => T) | undefined,
    fn: (state: T) => R,
  ): Promise<R> {
    return this.exclusive(() => {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const row = this.db
          .prepare("SELECT payload FROM relay_workspaces WHERE workspace_key=?")
          .get(key) as { payload: string } | undefined;
        if (!row && !seed)
          throw new ApiError(
            "Demo workspace expired. Reload to initialize a new one.",
            401,
          );
        if (!row) {
          this.db
            .prepare("DELETE FROM relay_workspaces WHERE updated_at<?")
            .run(Date.now() - 7 * 86400_000);
          const count = this.db
            .prepare("SELECT count(*) AS total FROM relay_workspaces")
            .get() as { total: number };
          if (count.total >= 200)
            throw new ApiError(
              "Demo workspace capacity reached. Please try again later.",
              503,
            );
        }
        const state = row ? (JSON.parse(row.payload) as T) : seed!();
        const result = fn(state);
        const payload = encodeDocument(state);
        this.db
          .prepare(
            "INSERT INTO relay_workspaces VALUES(?,?,?) ON CONFLICT(workspace_key) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at",
          )
          .run(key, payload, Date.now());
        this.db.exec("COMMIT");
        return result;
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    });
  }
  async ready(): Promise<boolean> {
    return this.exclusive(() => Boolean(this.db.prepare("SELECT 1").get()));
  }
  async close(): Promise<void> {
    return this.exclusive(() => {
      if (!this.closed) {
        this.db.close();
        this.closed = true;
      }
    });
  }
}
