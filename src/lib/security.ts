import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export interface Config {
  production: boolean;
  origin: string;
  secret: string;
  accessCode: string;
  writesEnabled: boolean;
  storage: "sqlite" | "mysql";
  sqlitePath: string;
  mysql: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    tls: boolean;
  };
}
const devSecret = randomBytes(48).toString("hex");
export const COOKIE_NAME = "relay_session";
const TTL = 7 * 86400;

export function getConfig(
  env: Record<string, string | undefined> = process.env,
): Config {
  const production = env.NODE_ENV === "production";
  const localPreview = env.RELAY_ALLOW_LOCAL_STORAGE === "true";
  if (production && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32))
    throw new ApiError(
      "Configure SESSION_SECRET with at least 32 random characters.",
      503,
    );
  let url: URL;
  try {
    url = new URL(env.APP_ORIGIN || "http://127.0.0.1:4633");
  } catch {
    throw new ApiError("Configure a valid canonical origin.", 503);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new ApiError(
      "APP_ORIGIN must be an origin without a path or credentials.",
      503,
    );
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (
    production &&
    (!env.APP_ORIGIN ||
      (url.protocol !== "https:" && !(localPreview && loopback)))
  )
    throw new ApiError("Hosted APP_ORIGIN must use HTTPS.", 503);
  const mysqlConfigured = Boolean(
    env.MYSQL_HOST &&
      env.MYSQL_DATABASE &&
      env.MYSQL_USER &&
      env.MYSQL_PASSWORD,
  );
  if (production && !localPreview && !mysqlConfigured)
    throw new ApiError(
      "Configure MySQL for hosted persistence. Local storage fallback is disabled.",
      503,
    );
  if (localPreview && !loopback)
    throw new ApiError(
      "Local storage preview is restricted to a loopback origin.",
      503,
    );
  const port = Number(env.MYSQL_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new ApiError("Invalid MySQL port.", 503);
  return {
    production,
    origin: url.origin,
    secret: env.SESSION_SECRET || devSecret,
    accessCode: env.DEMO_ACCESS_CODE || "",
    writesEnabled: env.RELAY_WRITES_ENABLED !== "false",
    storage: mysqlConfigured ? "mysql" : "sqlite",
    sqlitePath: env.RELAY_SQLITE_PATH || ".data/relay.sqlite",
    mysql: {
      host: env.MYSQL_HOST || "",
      port,
      database: env.MYSQL_DATABASE || "",
      user: env.MYSQL_USER || "",
      password: env.MYSQL_PASSWORD || "",
      tls: env.MYSQL_TLS !== "false",
    },
  };
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const mac = (value: string, config: Config) =>
  createHmac("sha256", config.secret).update(value).digest("base64url");
const equal = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const gate = (c: Config) => mac("gate:" + c.accessCode, c).slice(0, 16);
export function issueSession(
  config: Config,
  now = Math.floor(Date.now() / 1000),
): string {
  const payload = `${randomBytes(32).toString("hex")}.${now + TTL}.${gate(config)}`;
  return `${payload}.${mac("session:" + payload, config)}`;
}
export function verifySession(
  token: string | undefined,
  config: Config,
  now = Math.floor(Date.now() / 1000),
): { key: string; token: string } | null {
  if (!token || token.length > 256) return null;
  const parts = token.split(".");
  if (
    parts.length !== 4 ||
    !/^[a-f0-9]{64}$/.test(parts[0]) ||
    !/^\d{1,12}$/.test(parts[1])
  )
    return null;
  const expires = Number(parts[1]);
  if (expires <= now || expires > now + TTL || !equal(parts[2], gate(config)))
    return null;
  if (!equal(parts[3], mac("session:" + parts.slice(0, 3).join("."), config)))
    return null;
  return { key: hash(parts[0]), token };
}
export function csrfFor(token: string, config: Config): string {
  return mac("csrf:" + token, config);
}
export function verifyOrigin(headers: Headers, config: Config): void {
  if (
    headers.get("origin") !== config.origin ||
    headers.get("host") !== new URL(config.origin).host
  )
    throw new ApiError(
      "Use this app’s configured origin to perform the action.",
      403,
    );
}
export function verifyMutation(
  headers: Headers,
  token: string,
  config: Config,
): void {
  verifyOrigin(headers, config);
  if (
    !verifySession(token, config) ||
    !equal(headers.get("x-relay-csrf") || "", csrfFor(token, config))
  )
    throw new ApiError(
      "Session confirmation expired. Reload this page and retry.",
      403,
    );
}
export function sessionCookie(token: string, config: Config): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${TTL}${config.production && config.origin.startsWith("https:") ? "; Secure" : ""}`;
}
export function checkAccessCode(value: unknown, config: Config): boolean {
  return (
    typeof value === "string" &&
    value.length <= 256 &&
    equal(hash(value), hash(config.accessCode))
  );
}
export class SlidingLimiter {
  private buckets = new Map<string, { start: number; count: number }>();
  constructor(
    private maximum = 60,
    private windowMs = 60_000,
    private capacity = 1000,
  ) {}
  allow(key: string, now = Date.now()): boolean {
    for (const [id, b] of this.buckets)
      if (now - b.start >= this.windowMs) this.buckets.delete(id);
    const b = this.buckets.get(key);
    if (!b) {
      if (this.buckets.size >= this.capacity) return false;
      this.buckets.set(key, { start: now, count: 1 });
      return true;
    }
    if (b.count >= this.maximum) return false;
    b.count++;
    return true;
  }
}
