import {
  ApiError,
  COOKIE_NAME,
  SlidingLimiter,
  checkAccessCode,
  csrfFor,
  issueSession,
  sessionCookie,
  verifyMutation,
  verifyOrigin,
  verifySession,
  type Config,
} from "./security";
import type { DocumentStore } from "./storage";
import { RelayService, type Workspace } from "./service";

function json(
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new ApiError("Use application/json.", 415);
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > 262144))
    throw new ApiError("Request exceeds the 256 KiB limit.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("A JSON object is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 262144) {
      await reader.cancel();
      throw new ApiError("Request exceeds the 256 KiB limit.", 413);
    }
    chunks.push(chunk.value);
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError("Invalid JSON. Existing records were retained.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError("A JSON object is required.");
  return value as Record<string, unknown>;
}
function cookie(request: Request) {
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(COOKIE_NAME + "="));
  return raw?.slice(COOKIE_NAME.length + 1);
}
export function createHandler(config: Config, store: DocumentStore<Workspace>) {
  const service = new RelayService(store, {
      writesEnabled: config.writesEnabled,
    }),
    limiter = new SlidingLimiter(40, 60_000, 1000),
    accessLimiter = new SlidingLimiter(20, 60_000, 10),
    initLimiter = new SlidingLimiter(30, 60_000, 1);
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url),
      action = url.pathname.split("/").pop() || "";
    try {
      if (!["GET", "POST"].includes(request.method))
        throw new ApiError("Method not allowed.", 405);
      if (
        ![
          "state",
          "simulate",
          "approve",
          "cancel",
          "import",
          "reset",
          "export",
          "health",
          "access",
          "logout",
        ].includes(action)
      )
        throw new ApiError("Route not found.", 404);
      if (action === "health" && request.method === "GET") {
        if (url.searchParams.get("live") === "1")
          return json({ status: "ok", mode: "synthetic" });
        await store.ready();
        return json({
          status: "ok",
          mode: "synthetic",
          storage: config.storage,
          writes_enabled: config.writesEnabled,
        });
      }
      if (request.headers.get("host") !== new URL(config.origin).host)
        throw new ApiError(
          "Unexpected host. Use the configured app origin.",
          403,
        );
      const method = ["state", "export"].includes(action) ? "GET" : "POST";
      if (request.method !== method)
        throw new ApiError("Method not allowed.", 405);
      if (action === "access") {
        verifyOrigin(request.headers, config);
        if (!accessLimiter.allow("access"))
          throw new ApiError(
            "Too many demo access attempts. Wait one minute.",
            429,
          );
        const input = await body(request);
        if (!checkAccessCode(input.code ?? "", config))
          return json(
            {
              error: "The demo access code was not accepted.",
              access_required: true,
            },
            401,
          );
        const token = issueSession(config),
          session = verifySession(token, config)!;
        await store.ready();
        await service.initialize(session.key);
        return json({ ok: true }, 200, {
          "Set-Cookie": sessionCookie(token, config),
        });
      }
      let token = cookie(request),
        session = verifySession(token, config);
      let newCookie: string | undefined;
      if (!session) {
        if (action !== "state" || config.accessCode)
          return json(
            {
              error: config.accessCode
                ? "Enter the demo access code."
                : "Session expired. Reload to start a new workspace.",
              access_required: Boolean(config.accessCode),
            },
            401,
          );
        if (!initLimiter.allow("initialize"))
          throw new ApiError(
            "Demo initialization is busy. Wait one minute and retry.",
            429,
          );
        token = issueSession(config);
        session = verifySession(token, config)!;
        newCookie = sessionCookie(token, config);
        await store.ready();
        await service.initialize(session.key);
      }
      const headers: Record<string, string> = newCookie
        ? { "Set-Cookie": newCookie }
        : {};
      if (action === "state") {
        const state = await service.state(
          session.key,
          url.searchParams.get("tenant") || "packaging",
        );
        return json(
          {
            ...state,
            csrf: csrfFor(session.token, config),
            storage: config.storage,
          },
          200,
          headers,
        );
      }
      if (action === "export")
        return json(
          await service.export(
            session.key,
            url.searchParams.get("tenant") || "packaging",
          ),
          200,
          {
            "Content-Disposition":
              'attachment; filename="Aqion-Relay-Synthetic-Evidence.json"',
          },
        );
      verifyMutation(request.headers, session.token, config);
      if (!limiter.allow(session.key))
        throw new ApiError(
          "Too many requests. Wait one minute before trying again.",
          429,
        );
      const input = await body(request),
        tenant = input.tenant ?? "packaging";
      let result: unknown;
      switch (action) {
        case "simulate":
          result = await service.simulate(session.key, tenant, input.scenario);
          break;
        case "approve":
          result = await service.approve(
            session.key,
            tenant,
            input.proposal_id,
            input.plan_id,
            input.confirm,
          );
          break;
        case "cancel":
          result = await service.cancel(session.key, tenant, input.draft_id);
          break;
        case "import":
          result = await service.importSnapshot(
            session.key,
            tenant,
            input.snapshot,
          );
          break;
        case "reset":
          result = await service.reset(session.key, tenant, input.confirm);
          break;
        case "logout":
          return json({ ok: true }, 200, {
            "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${config.production ? "; Secure" : ""}`,
          });
      }
      return json(result);
    } catch (e) {
      const known = e instanceof ApiError;
      const validation =
        !known &&
        e instanceof Error &&
        /^(scenario\.|snapshot\.|history:|supplier\.|inbound\.|stock:|cash:|age_hours:)/.test(
          e.message,
        );
      return json(
        {
          error:
            known || validation
              ? (e as Error).message
              : "Workspace storage is unavailable. Retry shortly or contact the demo operator.",
        },
        known ? e.status : validation ? 400 : 503,
      );
    }
  };
}
