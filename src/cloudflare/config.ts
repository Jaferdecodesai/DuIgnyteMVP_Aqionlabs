import { ApiError, type Config } from "../lib/security";
export interface WorkerSettings {
  APP_ORIGIN?: string;
  SESSION_SECRET?: string;
  RELAY_WRITES_ENABLED?: string;
  DEMO_ACCESS_CODE?: string;
  RELAY_WORKER_LOCAL?: string;
}
export function getWorkerConfig(env: WorkerSettings): Config {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)
    throw new ApiError("A stable session signing secret is required.", 503);
  let url: URL;
  try { url = new URL(env.APP_ORIGIN || ""); }
  catch { throw new ApiError("A canonical app origin is required.", 503); }
  if (!["https:", "http:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash || url.username || url.password)
    throw new ApiError("APP_ORIGIN must contain only its scheme, host and port.", 503);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  const local = env.RELAY_WORKER_LOCAL === "true";
  if (local && !loopback)
    throw new ApiError("Local Worker preview requires a loopback origin.", 503);
  if (url.protocol !== "https:" && !(local && loopback))
    throw new ApiError("Hosted app origin must use HTTPS.", 503);
  if (env.RELAY_WRITES_ENABLED && !["true", "false"].includes(env.RELAY_WRITES_ENABLED))
    throw new ApiError("Invalid write-control configuration.", 503);
  return {
    production: true,
    origin: url.origin,
    secret: env.SESSION_SECRET,
    accessCode: env.DEMO_ACCESS_CODE || "",
    writesEnabled: env.RELAY_WRITES_ENABLED !== "false",
    storage: "durable-sqlite",
    sqlitePath: "",
    mysql: { host: "", port: 3306, database: "", user: "", password: "", tls: true },
  };
}
