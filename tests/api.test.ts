import { beforeEach, afterEach, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHandler } from "../src/lib/api";
import { getConfig } from "../src/lib/security";
import { SqliteStore } from "../src/lib/storage";
import type { Workspace } from "../src/lib/service";
let dir: string,
  db: SqliteStore<Workspace>,
  handler: ReturnType<typeof createHandler>;
const env = {
  NODE_ENV: "development",
  SESSION_SECRET: "test-only-long-secret-more-than-32-characters",
  APP_ORIGIN: "http://127.0.0.1:4633",
};
const scenario = { delay: 7, demand: 20, freight: 25, cash_floor: 24000 };
function req(
  action: string,
  body?: unknown,
  cookie = "",
  csrf = "",
  headers: Record<string, string> = {},
) {
  return new Request("http://127.0.0.1:4633/api/" + action, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      host: "127.0.0.1:4633",
      origin: env.APP_ORIGIN,
      cookie,
      "x-relay-csrf": csrf,
      "content-type": "application/json",
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function session() {
  const r = await handler(req("state"));
  expect(r.status).toBe(200);
  const s = await r.json();
  return {
    cookie: r.headers.get("set-cookie")!.split(";")[0],
    csrf: s.csrf,
    state: s,
  };
}
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "relay-api-"));
  db = new SqliteStore(path.join(dir, "a.sqlite"));
  handler = createHandler(getConfig(env), db);
});
afterEach(async () => {
  await db.close();
  await rm(dir, { recursive: true, force: true });
});
it("initializes a no-cache browser workspace", async () => {
  const a = await session();
  expect(a.state.snapshot.synthetic).toBe(true);
  expect(a.cookie).toMatch(/^relay_session=/);
  const r = await handler(req("state", undefined, a.cookie));
  expect(r.headers.get("cache-control")).toBe("no-store");
});
it("runs a scenario and creates an unsent draft through the API", async () => {
  const a = await session();
  const p = await (
    await handler(
      req("simulate", { tenant: "packaging", scenario }, a.cookie, a.csrf),
    )
  ).json();
  expect(p.recommended_id).toBeTruthy();
  const d = await handler(
    req(
      "approve",
      {
        tenant: "packaging",
        proposal_id: p.id,
        plan_id: p.recommended_id,
        confirm: true,
      },
      a.cookie,
      a.csrf,
    ),
  );
  expect(d.status).toBe(200);
  expect((await d.json()).draft.status).toBe("local_draft_unsent");
});
it("rejects cross-origin writes and other-session CSRF", async () => {
  const a = await session(),
    b = await session();
  expect(
    (
      await handler(
        req("simulate", { tenant: "packaging", scenario }, a.cookie, b.csrf),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await handler(
        req("simulate", { tenant: "packaging", scenario }, a.cookie, a.csrf, {
          origin: "https://evil.example",
        }),
      )
    ).status,
  ).toBe(403);
});
it("requires an existing session for exports", async () => {
  expect((await handler(req("export"))).status).toBe(401);
  const a = await session();
  const r = await handler(req("export", undefined, a.cookie));
  expect(r.headers.get("content-disposition")).toContain("attachment");
  expect(JSON.stringify(await r.json())).not.toContain(a.csrf);
});
it("gates workspace initialization behind an optional access code", async () => {
  handler = createHandler(
    getConfig({ ...env, DEMO_ACCESS_CODE: "sample-code" }),
    db,
  );
  expect((await handler(req("state"))).status).toBe(401);
  expect((await handler(req("access", { code: "bad" }))).status).toBe(401);
  const r = await handler(req("access", { code: "sample-code" }));
  expect(r.status).toBe(200);
  expect(r.headers.get("set-cookie")).toContain("HttpOnly");
});
it("rejects oversized bodies before parsing", async () => {
  const a = await session();
  const r = await handler(
    req("import", { padding: "x".repeat(262145) }, a.cookie, a.csrf),
  );
  expect(r.status).toBe(413);
});
it("rejects unsupported content types", async () => {
  const a = await session();
  expect(
    (
      await handler(
        req("simulate", { scenario }, a.cookie, a.csrf, {
          "content-type": "text/plain",
        }),
      )
    ).status,
  ).toBe(415);
});
it("returns field validation without exposing stack traces", async () => {
  const a = await session();
  const r = await handler(
    req(
      "simulate",
      { tenant: "packaging", scenario: { ...scenario, delay: -1 } },
      a.cookie,
      a.csrf,
    ),
  );
  expect(r.status).toBe(400);
  const b = await r.json();
  expect(b.error).toMatch(/delay/);
  expect(b.stack).toBeUndefined();
});
it("pauses new workspaces but leaves existing evidence readable", async () => {
  const a = await session();
  handler = createHandler(
    getConfig({ ...env, RELAY_WRITES_ENABLED: "false" }),
    db,
  );
  expect((await handler(req("state"))).status).toBe(503);
  expect((await handler(req("state", undefined, a.cookie))).status).toBe(200);
  expect(
    (
      await handler(
        req("reset", { tenant: "packaging", confirm: true }, a.cookie, a.csrf),
      )
    ).status,
  ).toBe(503);
});
it("returns safe readiness failure when storage is unavailable", async () => {
  handler = createHandler(getConfig(env), {
    ...db,
    ready: async () => {
      throw new Error("database-password-should-not-leak");
    },
  } as unknown as SqliteStore<Workspace>);
  const r = await handler(req("health"));
  expect(r.status).toBe(503);
  expect(await r.text()).not.toContain("password");
});
it("rejects unsupported route and method", async () => {
  expect((await handler(req("unknown"))).status).toBe(404);
  expect(
    (
      await handler(
        new Request("http://127.0.0.1:4633/api/state", {
          method: "PUT",
          headers: { host: "127.0.0.1:4633" },
        }),
      )
    ).status,
  ).toBe(405);
});
it("clears the browser cookie on logout", async () => {
  const a = await session();
  const r = await handler(req("logout", {}, a.cookie, a.csrf));
  expect(r.status).toBe(200);
  expect(r.headers.get("set-cookie")).toContain("Max-Age=0");
});
