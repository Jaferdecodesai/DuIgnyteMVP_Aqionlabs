# Aqion Relay — independent release review

Review date: 16 October 2026 (Asia/Dubai). Scope: the existing Node service, engine, UI and original pitch generator, plus the proposed Cloudflare migration. This is an engineering and evidence review, not a competition score, live ERP verification, formal security certification or browser QA result. The parent agent owns deployment and browser verification. Review findings below are a baseline for the final revision; they must be closed against the final files rather than assumed fixed.

## Review method and adaptations

Applied the requested gstack review checklist's critical pass (SQL/data safety, concurrency, trust boundaries and enum completeness), then documentation/distribution checks. Read the existing service, engine, session/CSRF/API implementation and related tests. The review, benchmark and QA skills include setup/telemetry/browser-daemon steps that were not invoked: this task uses Codex CUA for browser work, no telemetry or external posting, and changes are confined to this review directory. In this delegated session, interactive skill onboarding and repository routing changes are out of scope. The exact gstack workflow is therefore adapted, not represented as a gstack certification. The requested deep-research runner requires a Gemini key and paid external processing; current research uses official public web sources instead. No sensitive records were transmitted to an external model.

## Findings and decisions for the final revision

| ID | Priority / confidence | Evidence at review | Required disposition |
| --- | --- | --- | --- |
| R1 | Release gate / 10 of 10 | Existing `src/lib/security.ts` requires hosted MySQL and `src/lib/storage.ts` imports `node:sqlite`. Neither local SQLite persistence nor a MySQL-only deployment contract proves Worker compatibility. | Deploy a real Worker API and SQLite-backed Durable Object adapter. Run the full scenario, approval, cancel, import/reset and export flows in the deployed runtime. Do not replace these with static results. |
| R2 | P2 / 9 of 10 | `src/lib/storage.ts` sets `MAX_DOCUMENT_BYTES = 2 * 1024 * 1024`; each SQL row also carries a key and timestamp. Cloudflare's documented maximum SQL row size is 2 MB. | Use a conservative document ceiling below the row limit, or split storage; test boundary rejection without changing the previous document. A capped demo can use one coordinating object; this does not establish 40,000-SME capacity. |
| R3 | Release gate / 10 of 10 | `RelayService.approve` reads proposal/version, recomputes constraints, checks one outstanding draft and writes draft + audit inside `store.transact`. The SQLite service test exercises five concurrent duplicate approvals. | Preserve this complete atomic operation in the Durable Object. Test duplicate and different proposals concurrently in the Worker runtime. Verify rollback on callback/encoding failure. An in-memory check followed by an awaited write would weaken the existing guarantee. |
| R4 | P2 / 10 of 10 | `evidence/VALIDATION.md` says no GitHub push or remote Actions execution is claimed, while the current task already has a published repository. It also describes only the former Next/Hostinger runtime. | Retain historical evidence as dated history, add a new final-runtime report with deployment URL, commit/version and exact test coverage. Update README/deployment references so judges can reproduce the Cloudflare version. |
| R5 | Required deck change / 10 of 10 | Original `du-relay/scripts/build_pitch.mjs` cover has no repo/demo links; its final slide footnote contains the closing-date/login wording the owner explicitly requested removing. | Put the verified public repository and deployed Cloudflare URL on slide 1 as readable, clickable links in PPTX/PDF/HTML. Replace the closing slide with the pilot ask and delivery plan. Keep entry/login history in owner operational records, not in the judge narrative. |
| R6 | Positioning / 10 of 10 | Official Zoho documentation already describes replenishment strategy, quantity constraints and PO/transfer creation. SAP documents planning and procurement collaboration. | Lead with the combined cash-feasible disruption decision, an auditable owner workflow and the du rollout route. Do not claim unique alerts, forecasts, dashboards or purchase orders, or that competitors cannot implement cash constraints. |
| R7 | Evidence integrity / 10 of 10 | Engine `forecast()` labels the data fictional and says the same holdout selects the model. `calculate()` calls its search bounded and not globally optimal. | Keep concise labels such as “Synthetic scenario”, “Pilot target” and “Integration roadmap”. Replace hesitant prose with direct facts and commitments, while preserving these material distinctions. Do not turn 40%/15% targets into achievements or fictional outputs into customer results. |

No demonstrated P0/P1 defect was established in the existing numeric service during this bounded source pass. That conclusion does not cover the unreviewed final Worker adapter or prove live security. Items R1/R3 are mandatory deployment verification gates, rather than claims that a specific unimplemented adapter is defective.

## Verified controls that must survive migration

- Source validation rejects non-finite/out-of-range values, mismatched tenants, invalid dates, prototype-pollution keys, unsupported source sizes and non-synthetic imports. Unknown snapshot fields are rebuilt into an explicit contract.
- Approval recomputes against the saved snapshot/scenario/calculation hash, rejects changed inputs and proposals older than 30 minutes, excludes infeasible/non-improving plans and retains canceled duplicates as canceled. See `tests/service.test.ts` cases “makes duplicate concurrent approvals idempotent”, “prevents different proposals reusing reserved cash”, “invalidates old source versions on import” and “keeps a canceled duplicate canceled”.
- The modeled minimum cash includes opening cash and obligations before same-day receipts. Recovery spend is paid on day 1; recovered sales produce no new cash receipts within this slice. These assumptions are explicit in `calculate().assumptions`.
- Session HMAC, canonical origin/Host validation, same-origin CSRF, HttpOnly/SameSite cookies, bounded streamed JSON bodies and safe server errors are implemented in the original API. Exports omit session/CSRF material.
- A shared demo code is access gating, not enterprise identity. Anonymous browser isolation is appropriate only for this fictional demonstration. Production business onboarding needs authenticated SME membership and per-object authorization.

## Cloudflare architecture acceptance

Use one public origin for UI assets and API. Route `/api/*` into the Worker before any SPA fallback, so unknown APIs never return HTML with a misleading 200. Apply security headers to asset responses as well as JSON; Next server header configuration will not automatically transfer to a different asset server.

Store proposal inputs, drafts and audits durably, keyed by the verified signed session identity. Never accept a browser-supplied workspace key as authority. Reuse one initialized handler within the object, or persist/reset-safe counters, to avoid accidentally resetting limits on each request. Document whether each rate limit is per-object, per-isolate or edge-enforced. In-memory rate limiting is best-effort after object eviction/restarts; use platform abuse controls before broad public traffic.

Use `transactionSync` only with synchronous callbacks/SQL operations, matching Cloudflare's documented contract. Do not hold an SQL transaction open over network I/O. Do not forward requests to the object's internal API over a public URL. Fail closed on missing binding, invalid origin or missing secret. Never include a secret in frontend bundles, logs or slide links.

Retain a stable SESSION_SECRET so normal deployments do not invalidate judge sessions. Prove retention after refresh and a same-namespace redeploy; do not claim that a local emulator restart establishes hosted persistence. Use schema/migration names that preserve the existing namespace. Keep a known previous Worker version and a rollback procedure that does not delete data. Demo caps/retention should be visible and operator actionable.

## Roadmap and 150+ SME pilot quality

The existing 160-SME/four-wave design is stronger than an informal survey: common disruption drills, immediate/delayed access, blinded feasibility scoring and a prespecified primary planning-time measure. Preserve at least 150 enrolled participants as a start gate; 160 is an enrollment target, not committed recruitment or proof of statistical power.

Recommended release sequence: (1) 12–15 operator discovery interviews and approved sample mapping; (2) scoped read-only Zoho integration plus structured import, source reconciliation and freshness acceptance; (3) owner-approved sandbox draft, idempotency/outbox and ambiguous-result reconciliation; (4) sponsor-approved pilot enrollment, support and measurement; (5) measured expansion with tenant partitioning, queues, restore drills and cost/active-SME budgets. Verify Odoo version/plan/API availability before promising that connector.

Keep the pilot's 40% faster feasible-planning target primary, real stockout reduction exploratory and no unauthorized external write / no modeled floor violation as safety guardrails. Report all randomized SMEs, attrition, unusable-source cases, confidence intervals and protocol deviations. Use baseline variance and attrition to plan power before efficacy claims. A 40,000-SME roadmap needs a measured load profile, isolation, recovery and unit-cost evidence; arithmetic event rates alone do not prove scale.

## Sources

All primary-source links, access dates and retrieval limitations are in [PRIMARY_SOURCES.md](PRIMARY_SOURCES.md). The release checklist and benchmark protocol are in [RELEASE_QA_AND_BENCHMARK.md](RELEASE_QA_AND_BENCHMARK.md).

## Implementation rereview — Cloudflare adapter

Read the new `src/cloudflare/{config,store,worker}.ts`, `src/lib/storage-contract.ts` and `wrangler.jsonc` after implementation. No demonstrated release-blocking defect was found in this source pass. This is a source finding, not a deployed-runtime pass.

| Gate | Source evidence / disposition |
| --- | --- |
| R1 native deployment | Worker routes assets and API, private `RELAY_SQL` binding points to `RelayWorkspace`, migration creates a SQLite class and `nodejs_compat` is enabled. Actual deployment remains to verify. |
| R2 SQL row headroom | Fixed in shared contract: `MAX_DOCUMENT_BYTES = 1536 * 1024` leaves headroom below the row limit. R2 is closed in source; adapter rollback/boundary tests and runtime verification remain separate evidence. |
| R3 atomicity | `store.ts:36` returns `storage.transactionSync(() => { ... })`; source read, missing-record check, optional pruning/cap check, domain callback, encode and upsert are in that callback, without an `await`. Lines 50–51 explicitly reject a Promise-returning mutation. This preserves the synchronous service transaction contract. Runtime concurrency/rollback remains a release test. |
| Canonical request origin | `worker.ts:57` checks `url.origin !== config.origin`; API delegates the original Request, preserving canonical Host/Origin/session validation in `createHandler`. Configuration requires a stable secret and HTTPS except explicit loopback preview. |
| API isolation from assets | `worker.ts:56,63–68` recognizes `/api` and `/api/*`, uses an exact action allowlist and returns 404 before asset fetching. Wrangler uses `run_worker_first: true`. Unknown API paths cannot fall through to the static app in this code. |
| Cache/security policy | `worker.ts:25–33` wraps shell, assets, API and safe errors with security headers; the exact cache line is `immutable && response.ok && !headers.has("Set-Cookie") ? "public, max-age=31536000, immutable" : "no-store"`. Only the `/_next/static/` asset branch passes the immutable flag. Runtime headers/cookies still need measurement. |
| Object lifecycle | `RelayWorkspace` retains one handler per object instance with `this.handler ||= createHandler(...)` at `worker.ts:45`; rate-limit counters therefore survive requests within that instance. They are not durable across eviction/restart. Singleton name `relay-demo-v1` deliberately centralizes this capped demo; it is not the proposed tenant-sharded enterprise architecture. |

Remaining release gates: real runtime crypto/API compatibility, Host and secure cookie behavior, state persistence through reload and same-namespace redeploy, concurrent duplicate/different-plan approvals, API/header response checks, final source/URL consistency and final deck inspection. Do not label these complete merely from this review.

## Draft pitch rereview

Read `pitch/CONTENT.md` and the builder and visually inspected the 14-slide draft contact sheet. It covers ResilienceTech, the operational problem, a concrete recovery result, human review, the forecast/constraint boundary, the Cloudflare architecture, eight-week integration preparation, a 160-SME four-wave pilot, explicit targets/guardrails, the scale/commercial route and a sponsor ask. The synthetic-result slide is visibly labelled; the KPI slide is visibly a target scorecard; the scale slide separates ambition from rollout stages. The original closing-date/login sentence is absent from the new visible narrative.

Final changes requested from the deck owner: insert the verified URL and both hyperlinks on slide 1, regenerate the architecture notes from the current builder (remove internal confirmation prose), use “Enrollment target” rather than the standalone “SMEs enrolled” to avoid implying recruited participants, and prefer an actual verified app screenshot for slide 7 while retaining its editable explanatory text. The current vector mock is labelled illustrative and therefore not a false screenshot, but it is weaker proof of a working product. These recommendations were sent to the parent; final artifacts must be reinspected after regeneration.
