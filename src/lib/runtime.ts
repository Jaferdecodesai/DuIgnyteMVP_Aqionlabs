import { ApiError, type Config } from "./security";
import type { DocumentStore } from "./storage";
import type { Workspace } from "./service";
import { createHandler } from "./api";
export function createRuntime(
  makeStore: (config: Config) => DocumentStore<Workspace>,
  getConfig: () => Config,
) {
  let pending: Promise<ReturnType<typeof createHandler>> | undefined;
  const initialize = async () => {
    const config = getConfig(),
      store = makeStore(config);
    try {
      await store.ready();
      return createHandler(config, store);
    } catch (error) {
      try {
        await store.close();
      } catch {
        /* Preserve the original safe failure. */
      }
      throw error;
    }
  };
  return async (request: Request): Promise<Response> => {
    const current = (pending ??= initialize());
    try {
      return await (
        await current
      )(request);
    } catch (error) {
      if (pending === current) pending = undefined;
      return Response.json(
        {
          error:
            error instanceof ApiError
              ? error.message
              : "Workspace storage is unavailable. Contact the demo operator.",
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}
