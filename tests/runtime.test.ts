import { expect, it, vi } from "vitest";
import { createRuntime } from "../src/lib/runtime";
import { getConfig } from "../src/lib/security";
import type { DocumentStore } from "../src/lib/storage";
import type { Workspace } from "../src/lib/service";
const config = () => getConfig({ NODE_ENV: "test" });
function fakeStore(): DocumentStore<Workspace> {
  return {
    ready: vi.fn(async () => true),
    close: vi.fn(async () => {}),
    read: vi.fn(async () => undefined),
    transact: vi.fn(),
  };
}
const request = () => new Request("http://127.0.0.1:4633/api/health?live=1");
it("shares one store initialization across simultaneous cold requests", async () => {
  let release!: () => void;
  const ready = new Promise<void>((r) => {
    release = r;
  });
  const store = fakeStore();
  store.ready = vi.fn(async () => {
    await ready;
    return true;
  });
  const factory = vi.fn(() => store);
  const handle = createRuntime(factory, config);
  const first = handle(request()),
    second = handle(request());
  release();
  const responses = await Promise.all([first, second]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  expect(factory).toHaveBeenCalledTimes(1);
});
it("closes failed initialization and retries a fresh connection on next request", async () => {
  const failed = fakeStore();
  failed.ready = vi.fn(async () => {
    throw Error("private connection details");
  });
  const healthy = fakeStore();
  const factory = vi.fn().mockReturnValueOnce(failed).mockReturnValue(healthy);
  const handle = createRuntime(factory, config);
  const error = await handle(request());
  expect(error.status).toBe(503);
  expect(await error.text()).not.toContain("private connection");
  expect(failed.close).toHaveBeenCalledTimes(1);
  expect((await handle(request())).status).toBe(200);
  expect(factory).toHaveBeenCalledTimes(2);
});
it("returns safe unavailability on invalid config without opening storage", async () => {
  const factory = vi.fn(() => fakeStore());
  const handle = createRuntime(factory, () =>
    getConfig({ NODE_ENV: "production" }),
  );
  expect((await handle(request())).status).toBe(503);
  expect(factory).not.toHaveBeenCalled();
});
