> Historical Node/MySQL baseline. The current deployed release is Cloudflare Workers with native Durable Object SQLite; see [final validation](../evidence/FINAL_RELEASE.md) and [Cloudflare runbook](CLOUDFLARE.md). The current document cap is 1.5 MiB.

# Architecture and security review

Reviewed 16 October 2026 against `node-web-mvp.md` and the prior local prototype API contract. This is a design review, not a claim that implementation or hosted deployment has passed validation.

## Decision

Proceed with one Next.js App Router Node server and the existing bounded synthetic recovery workflow. Server-only modules own calculations, workspace authorization, transactional transitions and storage. Client Components own interaction state and accessible responsive presentation. No native app, SIEM, live AI, banking or supplier integration is needed for this scope.

Use SQLite only for local development with an explicit writable path outside packaged source. Hosted mode uses MySQL/MariaDB through environment settings. A hosted process must fail readiness if its database or security configuration is unavailable; it must never silently switch to SQLite or ephemeral memory. Build and type checks must succeed without a database connection or deployment credentials.

## Minimum contract corrections

1. **Canonical request origin.** Configure an exact `APP_ORIGIN` for deployed requests and derive the expected origin from that setting. Do not accept arbitrary `Host`, `X-Forwarded-Host` or forwarded protocol values as trusted security inputs. Local development may use a documented loopback origin. Reject absent, malformed, mismatched or `null` Origin headers for mutations. Compare complete normalized origins, including scheme and port. Document the trusted proxy boundary if forwarded headers are ever enabled.
2. **Workspace-bound session and CSRF.** Use a random unguessable workspace token in an expiring signed HttpOnly cookie; store only its SHA256 identifier as the workspace key. Use `Secure` in HTTPS deployments, `SameSite=Lax` or stricter and `Path=/`. A CSRF token must be bound to the verified workspace session, never a process-global value. Keep session signing and CSRF material out of exports, exception responses and logs. Optional shared access-code entry requires the same origin policy, bounded attempts and constant-time verification; it is a demo gate, not proof of business identity.
3. **Authorization on every path.** Derive workspace identity exclusively from verified server-side session state. A request may choose only a supported fictional tenant within that workspace. Storage queries, proposal lookup, draft approval, cancellation, reset, state and export must all include the workspace key. Client-provided workspace IDs must never select storage. Missing, tampered and expired sessions must never restore another workspace.
4. **Atomic transition boundary.** Lock the workspace row before reading version and outstanding drafts. Validate current snapshot version, proposal expiry, plan eligibility and duplicate approval in that same transaction. MySQL initialization and `SELECT ... FOR UPDATE` must use the same checked-out connection and transaction, with rollback on every failure and release in `finally`. SQLite must serialize `BEGIN IMMEDIATE` operations on its connection; concurrent requests must not interleave transactions. Keep reset/import invalidation and audit writes atomic with the corresponding state mutation.
5. **Finite retained state.** Bound request body bytes before parsing; bound every imported list, string and number, and reject nonfinite values. Bound forecast search work and enforce a simulation request limit before computing. Set explicit maximum retained proposals, audit entries and total workspace document size, plus workspace expiry and cleanup. TTL cleanup must never delete an active transaction's workspace. Single-process rate limits must be described as such and supplemented at the hosting edge if multiple instances are introduced.
6. **Write-disable semantics.** Document that state initialization and session creation can create a database row. When writes are disabled, an existing valid workspace may be read/exported; initialization and every mutation must fail with a clear 503 response before modifying storage. A read must not perform a hidden cleanup or expiry extension in this mode. Liveness can return 200 while readiness returns 503. Health output contains only status/version, never credentials, connection strings or raw database errors.
7. **Consistent API responses.** All dynamic state, errors and exports use `Cache-Control: no-store`. Reject unsupported HTTP methods and media types. Return validated safe errors with stable status codes and no stack traces. Preserve explicit `synthetic:true`, fixture time, local unsent draft status, model/calc versions and no-external-effect disclosure. Export only the current workspace's evidence. Set download headers and safe filenames independently of imported strings.
8. **Deployment configuration.** Validate the production signing secret and canonical origin at startup/request readiness; require MySQL configuration in hosted mode. TLS certificate verification remains enabled unless an explicit hosting configuration requires and documents an alternate connection boundary. Avoid logging database URLs or secrets during failed configuration. Use parameterized SQL throughout. CI installs from the lockfile, tests, type-checks, builds and audits dependencies. The source archive excludes `.env*` secrets, data stores, evidence containing session material, `node_modules` and `.next`.

## Required acceptance scenarios

Write the relevant test first and observe a failure caused by the missing behavior, then implement and rerun it. Record RED and GREEN evidence for new behavioral work.

| Area | Required observable result |
| --- | --- |
| Isolation | Two browser sessions can mutate the same tenant independently; neither state, export, proposal nor draft leaks between them. Supplying another session's proposal/draft ID fails safely. |
| Session | Tampered and expired signatures are rejected. A newly initialized session cannot retrieve the expired workspace. HTTPS production cookies include Secure and HttpOnly. |
| CSRF | Missing token, token from another session, mismatched Origin and spoofed forwarded host are rejected without mutation. |
| Access gate | When enabled, all protected reads and mutations require a valid gated session. Incorrect code cannot initialize a protected workspace or trigger simulation. |
| Approval race | Two simultaneous approvals of one proposal produce one draft. Two different proposals cannot create two outstanding drafts for one tenant. |
| Cancellation | Duplicate approval of a canceled draft returns its canceled status and does not recreate an outstanding draft. |
| Import/reset race | A proposal generated before an import/reset cannot be approved after that mutation commits. Export never mixes versions. |
| Storage parity | SQLite and MySQL adapters obey the same transaction/version contract; real hosted MySQL connectivity remains separately verified by the owner. |
| Limits | Oversized/chunked payloads, oversized arrays, extreme strings, nonfinite/out-of-range values and unsupported fields fail clearly. Maximum permitted simulation finishes within the documented budget. |
| Write-disable | Existing state/export remain readable; new workspace creation, simulate, approval, cancellation, import and reset do not write and return the documented unavailable result. |
| Failure behavior | Database failure yields a safe response and readiness failure. Restart restores committed state using the configured adapter. No local fallback occurs in hosted mode. |
| Mobile workflow | At 375/390/768/1440 pixels and landscape, scenario entry, comparison, confirm/cancel dialogs, import/reset, audit and evidence download remain usable without horizontal page overflow. |
| Accessibility | Keyboard focus enters and returns from dialogs; Escape cancels; input errors have labels; chart data has a text/table alternative; reduced motion and increased text sizing preserve controls. |
| Disclosure | Every flow continues to identify synthetic source data and unsent drafts. No UI suggests that an approval sends a supplier order. |

## Rollout and remaining verification

Prepare a clean GitHub-importable source package, pinned supported Node runtime, environment example and reproducible build/start commands. Document initial schema creation, backups before release, retention cleanup and rollback to the prior Git revision. Keep schema changes backward compatible for this MVP so a code rollback does not require destructive database rollback.

Hostinger plan entitlement, hPanel build/start settings, production secret configuration, actual database connection/TLS behavior, domain HTTPS and a post-deploy smoke test require the owner's hosting environment. Local preparation and a successful build do not establish that the app is deployed or production accepted.


## Implemented contract clarification

The final operator-pause behavior permits an existing workspace to run a **stateless** calculation: no proposal or audit entry is persisted, and the result cannot be approved while saving is paused. New workspace creation, approval, cancellation, import and reset remain blocked with 503. State/export remain readable without cleanup or TTL writes. This deliberate refinement supersedes the initial requirement that every simulate request return 503. The service/API tests verify no writes for this paused calculation.

Runtime initialization now shares one in-flight initialization across cold requests, closes a failed adapter, and permits a later retry; three behavior tests cover this boundary.

Import normalization constructs the known schema and strips harmless unknown fields; dangerous object keys are rejected recursively. This clarifies the initial acceptance checklist wording about unsupported fields.
