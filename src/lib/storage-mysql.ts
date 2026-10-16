import { createPool } from "mysql2/promise";
import { ApiError, type Config } from "./security";
import { encodeDocument, type DocumentStore } from "./storage";
interface ConnectionPort {
  query(sql: string, args?: unknown[]): Promise<[unknown, unknown]>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}
interface PoolPort {
  query(sql: string, args?: unknown[]): Promise<[unknown, unknown]>;
  getConnection(): Promise<ConnectionPort>;
  end(): Promise<void>;
}
export class MysqlStore<T> implements DocumentStore<T> {
  private pool: PoolPort;
  constructor(config: Config["mysql"], pool?: PoolPort) {
    this.pool =
      pool ??
      (createPool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        connectionLimit: 5,
        queueLimit: 20,
        waitForConnections: true,
        connectTimeout: 10_000,
        charset: "utf8mb4",
        ...(config.tls ? { ssl: { rejectUnauthorized: true } } : {}),
      }) as unknown as PoolPort);
  }
  async ready(): Promise<boolean> {
    await this.pool.query(
      "CREATE TABLE IF NOT EXISTS relay_workspaces (workspace_key VARCHAR(64) PRIMARY KEY, payload LONGTEXT NOT NULL, updated_at BIGINT NOT NULL) ENGINE=InnoDB",
    );
    await this.pool.query("SELECT 1");
    return true;
  }
  async read(key: string): Promise<T | undefined> {
    const [rows] = await this.pool.query(
      "SELECT payload FROM relay_workspaces WHERE workspace_key=?",
      [key],
    );
    const row = (rows as { payload: string }[])[0];
    return row ? (JSON.parse(row.payload) as T) : undefined;
  }
  async transact<R>(
    key: string,
    seed: (() => T) | undefined,
    fn: (state: T) => R,
  ): Promise<R> {
    const c = await this.pool.getConnection();
    let lock = false,
      started = false;
    try {
      if (seed) {
        const [rows] = await c.query(
          "SELECT GET_LOCK('aqion_relay_workspace_capacity',5) AS acquired",
        );
        lock = Number((rows as { acquired: number }[])[0]?.acquired) === 1;
        if (!lock)
          throw new ApiError("Demo initialization is busy. Please retry.", 503);
      }
      await c.beginTransaction();
      started = true;
      const [rows] = await c.query(
        "SELECT payload FROM relay_workspaces WHERE workspace_key=? FOR UPDATE",
        [key],
      );
      const row = (rows as { payload: string }[])[0];
      if (!row && !seed)
        throw new ApiError(
          "Demo workspace expired. Reload to initialize a new one.",
          401,
        );
      if (!row) {
        await c.query("DELETE FROM relay_workspaces WHERE updated_at<?", [
          Date.now() - 7 * 86400_000,
        ]);
        const [counts] = await c.query(
          "SELECT COUNT(*) AS total FROM relay_workspaces",
        );
        if (Number((counts as { total: number }[])[0].total) >= 200)
          throw new ApiError("Demo capacity reached. Try again later.", 503);
      }
      const state = row ? (JSON.parse(row.payload) as T) : seed!(),
        result = fn(state),
        payload = encodeDocument(state);
      if (row)
        await c.query(
          "UPDATE relay_workspaces SET payload=?,updated_at=? WHERE workspace_key=?",
          [payload, Date.now(), key],
        );
      else
        await c.query(
          "INSERT INTO relay_workspaces(workspace_key,payload,updated_at) VALUES(?,?,?)",
          [key, payload, Date.now()],
        );
      await c.commit();
      started = false;
      return result;
    } catch (e) {
      if (started) await c.rollback();
      throw e;
    } finally {
      try {
        if (lock)
          await c.query(
            "SELECT RELEASE_LOCK('aqion_relay_workspace_capacity')",
          );
      } finally {
        c.release();
      }
    }
  }
  async close(): Promise<void> {
    await this.pool.end();
  }
}
