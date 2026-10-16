import { describe, expect, it } from "vitest";
import {
  getConfig,
  issueSession,
  verifySession,
  csrfFor,
  verifyMutation,
  sessionCookie,
  checkAccessCode,
  SlidingLimiter,
} from "../src/lib/security";

const env = {
  NODE_ENV: "development",
  SESSION_SECRET: "test-secret-with-at-least-48-characters-for-tests-only",
  APP_ORIGIN: "http://127.0.0.1:4633",
};
describe("hosting config and workspace request boundary", () => {
  it("rejects hosted ephemeral data fallback", () => {
    expect(() =>
      getConfig({
        ...env,
        NODE_ENV: "production",
        APP_ORIGIN: "https://relay.example",
      }),
    ).toThrow(/MySQL/);
  });
  it("requires a strong production session secret", () => {
    expect(() =>
      getConfig({
        NODE_ENV: "production",
        APP_ORIGIN: "https://relay.example",
      }),
    ).toThrow(/SESSION_SECRET/);
  });
  it("rejects canonical origin paths", () => {
    expect(() =>
      getConfig({ ...env, APP_ORIGIN: "https://relay.example/path" }),
    ).toThrow(/origin/);
  });
  it("does not expose another workspace through cookie tampering", () => {
    const c = getConfig(env),
      token = issueSession(c, 1000);
    expect(verifySession(token, c, 1001)?.key).toHaveLength(64);
    expect(verifySession("tampered" + token, c, 1001)).toBeNull();
    expect(verifySession(token, c, 1000 + 7 * 86400 + 1)).toBeNull();
    expect(verifySession(undefined, c, 1001)).toBeNull();
  });
  it("invalidates sessions when the demo gate changes", () => {
    const c = getConfig(env),
      token = issueSession(c, 1000);
    expect(
      verifySession(
        token,
        getConfig({ ...env, DEMO_ACCESS_CODE: "new-code" }),
        1001,
      ),
    ).toBeNull();
  });
  it("binds the CSRF token to the signed browser workspace", () => {
    const c = getConfig(env),
      a = issueSession(c),
      b = issueSession(c);
    expect(csrfFor(a, c)).not.toBe(csrfFor(b, c));
    const good = new Headers({
      origin: c.origin,
      host: "127.0.0.1:4633",
      "x-relay-csrf": csrfFor(a, c),
    });
    expect(() => verifyMutation(good, a, c)).not.toThrow();
    for (const changes of [
      { origin: "https://evil.example" },
      { origin: "null" },
      { "x-relay-csrf": csrfFor(b, c) },
      { host: "evil.example", "x-forwarded-host": "127.0.0.1:4633" },
    ]) {
      const h = new Headers(good);
      Object.entries(changes).forEach(([k, v]) => h.set(k, v));
      expect(() => verifyMutation(h, a, c)).toThrow();
    }
  });
  it("sets secure private cookies for hosted sessions", () => {
    const c = getConfig({
      ...env,
      NODE_ENV: "production",
      APP_ORIGIN: "https://relay.example",
      MYSQL_HOST: "db",
      MYSQL_DATABASE: "relay",
      MYSQL_USER: "relay",
      MYSQL_PASSWORD: "test-only",
    });
    expect(sessionCookie("token", c)).toContain("Secure");
    expect(sessionCookie("token", c)).toContain("HttpOnly");
    expect(sessionCookie("token", c)).toContain("SameSite=Strict");
  });
  it("checks an optional demo code without reflecting it", () => {
    const c = getConfig({ ...env, DEMO_ACCESS_CODE: "test-demo-code" });
    expect(checkAccessCode("wrong", c)).toBe(false);
    expect(checkAccessCode("test-demo-code", c)).toBe(true);
    expect(checkAccessCode({}, c)).toBe(false);
  });
  it("bounds requests per key with expiration", () => {
    const l = new SlidingLimiter(2, 100, 2);
    expect(l.allow("a", 0)).toBe(true);
    expect(l.allow("a", 1)).toBe(true);
    expect(l.allow("a", 2)).toBe(false);
    expect(l.allow("b", 2)).toBe(true);
    expect(l.allow("c", 2)).toBe(false);
    expect(l.allow("a", 101)).toBe(true);
  });
});
