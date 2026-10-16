import { describe, expect, it, vi } from "vitest";
import { getWorkerConfig } from "../src/cloudflare/config";
import { sessionCookie } from "../src/lib/security";
const settings = { APP_ORIGIN: "https://aqionrelaydu.example.workers.dev", SESSION_SECRET: "local-test-only-secret-0123456789abcdef" };
describe("Cloudflare deployment configuration", () => {
 it("requires canonical origin and stable secret and uses native durable storage", () => {
  const config = getWorkerConfig(settings);
  expect(config).toMatchObject({ production: true, storage: "durable-sqlite", origin: settings.APP_ORIGIN, writesEnabled: true });
  expect(sessionCookie("token",config)).toContain("Secure");
  expect(getWorkerConfig({...settings,RELAY_WRITES_ENABLED:"false"}).writesEnabled).toBe(false);
 });
 it("rejects missing or weak secrets and malformed origins", () => {
  for(const env of [{...settings, SESSION_SECRET:"short"},{...settings,SESSION_SECRET:undefined},{...settings,APP_ORIGIN:undefined},{...settings,APP_ORIGIN:"https://host/path"},{...settings,APP_ORIGIN:"https://user:pass@host"},{...settings,APP_ORIGIN:"https://host?query"},{...settings,APP_ORIGIN:"https://host#fragment"},{...settings,APP_ORIGIN:"not-an-origin"}]) expect(() => getWorkerConfig(env)).toThrow();
 });
 it("only allows HTTP with explicit loopback preview opt-in", () => {
  expect(() => getWorkerConfig({...settings,APP_ORIGIN:"http://127.0.0.1:8787"})).toThrow();
  expect(getWorkerConfig({...settings,APP_ORIGIN:"http://127.0.0.1:8787", RELAY_WORKER_LOCAL:"true"}).origin).toBe("http://127.0.0.1:8787");
  expect(() => getWorkerConfig({...settings,APP_ORIGIN:"http://public.example",RELAY_WORKER_LOCAL:"true"})).toThrow();
  expect(() => getWorkerConfig({...settings,APP_ORIGIN:"https://public.example",RELAY_WORKER_LOCAL:"true"})).toThrow();
 });
});

import worker, { type Env } from "../src/cloudflare/worker";
function bindings(): Env {
 return { ...settings, ASSETS: {fetch: vi.fn(async () => new Response("<html>Relay</html>", { headers: {"Content-Type":"text/html"} }))}, RELAY_SQL: {idFromName: vi.fn(name => name), get: vi.fn(() => ({fetch: vi.fn(async () => new Response(JSON.stringify({status:"ok",storage:"durable-sqlite"}),{headers:{"Content-Type":"application/json"}}))}))} };
}
describe("Worker routing and response boundaries", () => {
 it("serves static assets through the binding with the same security headers", async () => {
  const env = bindings(), request = new Request(settings.APP_ORIGIN);
  const result = await worker.fetch(request, env);
  expect(result.status).toBe(200); expect(await result.text()).toContain("Relay");
  expect(env.ASSETS?.fetch).toHaveBeenCalledWith(request);
  expect(result.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  expect(result.headers.get("Cache-Control")).toBe("no-store");
 });
 it("forwards API requests intact to one stable coordinator and never to assets", async () => {
  const env = bindings(), request = new Request(settings.APP_ORIGIN+"/api/state?tenant=packaging",{headers:{host:new URL(settings.APP_ORIGIN).host,origin:settings.APP_ORIGIN,cookie:"private-session"}});
  const result = await worker.fetch(request,env);
  expect(result.status).toBe(200); expect(env.RELAY_SQL?.idFromName).toHaveBeenCalledWith("relay-demo-v1");
  const stub = (env.RELAY_SQL?.get as ReturnType<typeof vi.fn>).mock.results[0].value;
  expect(stub.fetch).toHaveBeenCalledWith(request); expect(env.ASSETS?.fetch).not.toHaveBeenCalled();
  expect(result.headers.get("Cache-Control")).toBe("no-store");
 });
 it("API-like nested and unknown paths return JSON errors and cannot fall through to HTML", async () => {
  const env = bindings();
  for (const route of ["/api", "/api/extra/state", "/api/missing"]) {
   const result = await worker.fetch(new Request(settings.APP_ORIGIN+route),env);
   expect(result.status).toBe(404); expect(result.headers.get("Content-Type")).toContain("application/json");
  }
  expect(env.ASSETS?.fetch).not.toHaveBeenCalled();
 });
 it("unsupported methods are rejected before bindings run", async () => {
  const env = bindings();
  for(const route of ["/", "/api/state"]) {
   const result = await worker.fetch(new Request(settings.APP_ORIGIN+route,{method:"DELETE"}),env);
   expect(result.status).toBe(405);
  }
  expect(env.ASSETS?.fetch).not.toHaveBeenCalled(); expect(env.RELAY_SQL?.get).not.toHaveBeenCalled();
 });
 it("missing configuration or bindings fails closed without reflecting secrets", async () => {
  for(const env of [{...bindings(), SESSION_SECRET:undefined},{...bindings(),ASSETS:undefined},{...bindings(),RELAY_SQL:undefined}]) {
   const result = await worker.fetch(new Request(settings.APP_ORIGIN+"/api/state"),env);
   expect(result.status).toBe(503); expect(await result.text()).not.toContain(settings.SESSION_SECRET);
  }
 });
});
