import { createHandler } from "../lib/api";
import type { Workspace } from "../lib/service";
import { getWorkerConfig, type WorkerSettings } from "./config";
import { DurableSqliteStore, type DurableStoragePort } from "./store";

export interface FetcherPort { fetch(request: Request): Promise<Response>; }
export interface NamespacePort {
  idFromName(name: string): unknown;
  get(id: unknown): FetcherPort;
}
export interface Env extends WorkerSettings {
  ASSETS?: FetcherPort;
  RELAY_SQL?: NamespacePort;
}
const apiActions = new Set(["state", "simulate", "approve", "cancel", "import", "reset", "export", "health", "access", "logout"]);
function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
function unavailable(): Response {
  return jsonError("The demo is temporarily unavailable. Please retry shortly.", 503);
}
/** Apply the same policy to the app shell, assets and JSON errors. */
function secure(response: Response, immutable = false): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'");
  headers.set("Cache-Control", immutable && response.ok && !headers.has("Set-Cookie") ? "public, max-age=31536000, immutable" : "no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** Classic Durable Object export; its native SQLite database has one owner. */
export class RelayWorkspace {
  private handler?: ReturnType<typeof createHandler>;
  private store: DurableSqliteStore<Workspace>;
  constructor(ctx: { storage: DurableStoragePort }, private env: Env) {
    this.store = new DurableSqliteStore<Workspace>(ctx.storage);
  }
  async fetch(request: Request): Promise<Response> {
    try {
      this.handler ||= createHandler(getWorkerConfig(this.env), this.store);
      return secure(await this.handler(request));
    } catch { return secure(unavailable()); }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const config = getWorkerConfig(env);
      if (!env.ASSETS || !env.RELAY_SQL) return secure(unavailable());
      const url = new URL(request.url), isApi = url.pathname === "/api" || url.pathname.startsWith("/api/");
      if (url.origin !== config.origin)
        return secure(jsonError("Use the configured app origin.", 403));
      const allowed = isApi ? ["GET", "POST"] : ["GET", "HEAD"];
      if (!allowed.includes(request.method))
        return secure(jsonError("Method not allowed.", 405));
      if (isApi) {
        const match = /^\/api\/([a-z]+)$/.exec(url.pathname);
        if (!match || !apiActions.has(match[1]))
          return secure(jsonError("Route not found.", 404));
        // Preserve URL, Host, Origin, cookies and streaming body. Do not trust proxy headers.
        const id = env.RELAY_SQL.idFromName("relay-demo-v1");
        return secure(await env.RELAY_SQL.get(id).fetch(request));
      }
      return secure(await env.ASSETS.fetch(request), url.pathname.startsWith("/_next/static/"));
    } catch { return secure(unavailable()); }
  },
};
