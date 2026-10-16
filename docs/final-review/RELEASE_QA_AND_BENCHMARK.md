# Final release QA and benchmark protocol

Prepared 16 October 2026. **This file is an execution checklist, not a claim that the final Cloudflare release passed.** Parent-owned final deployment/browser evidence must record each result and link the artifacts. Existing Node test evidence is historical baseline only.

## Acceptance matrix

| Requirement | Authoritative completion evidence |
| --- | --- |
| Refined mobile web app with the full workflow | Deployed UI renders; scenario changes alter real engine output; review confirmation creates a persisted draft; cancel/import/reset/export behave correctly. |
| Cloudflare deployment owned by the user | Wrangler/API success identifies account, Worker name/version and canonical HTTPS URL; direct URL works without a developer machine. |
| URL begins with AqionRelayDuMVP | Verified final hostname with the requested leading label, using lowercase where DNS/platform naming requires it. |
| Real server persistence | Save + browser refresh + same-namespace redeploy retains the same draft/audit; second session remains isolated. |
| Public GitHub source is current | Intended changes only, secret scan, commit SHA, push success and equality with origin/main. CI covers the actual Cloudflare build. |
| Pitch, roadmap and pilot plan | Final PPTX, PDF and HTML contain the selected track, operation, integrations, 150+ pilot, targets, safeguards, du value, scale gates and a concrete closing ask. |
| Both links on slide 1 | Extract slide 1 text and hyperlink relationships from PPTX; inspect PDF annotations and HTML anchors; follow both URLs in CUA. |
| Confident, evidence-grounded copy | Requested deadline/login sentence removed from visible slides and notes. Scenario results labelled synthetic; pilot percentages labelled targets; no invented customers/API approval/revenue. |
| Editable, readable final deck | Native editable text/shapes/tables in PPTX; PDF opens; HTML navigation/edit/export works; every final slide rendered and inspected for clipping, density and legibility. |
| Submission-ready handoff | Final deck sizes and hashes recorded, source/release links included, no placeholder demo URL or stale Hostinger instructions. Portal upload/receipt remains separate unless actually performed. |

## Automated release checks

1. Run type checking, full tests/coverage and production/static build on the committed dependency lockfile under the supported runtime. Record command, date, counts and scope, rather than copying prior counts.
2. Run Worker-runtime tests with the actual Durable Object adapter: initialization, bounded storage, read isolation, atomic rollback and concurrent duplicate approvals. Test different proposals racing for the single outstanding-draft guard.
3. Verify API health/readiness, method rejection, unknown action, malformed/oversized streamed JSON, missing/wrong Origin, CSRF mismatch, cross-session proposal/draft use, invalid import retention and paused writes.
4. Test stale source (>24 modeled hours), expired quote, 30-minute proposal expiry, changed source version, fabricated plan, insufficient cash floor, no-service-improvement case and canceled duplicate replay.
5. Verify `.env`/secret/database/build artifacts are absent from public source and asset uploads; inspect production bundle for secret variable values without printing any value into reports. Security headers must be checked on both HTML and API responses.
6. Use deployed HTTP checks for runtime behavior; a mock or local Node pass cannot establish Worker SQL/headers/cookies/routing behavior. Treat the final deployed commit/version as the test subject.

## CUA browser workflow

The parent runs this in Codex CUA, without an alternate browser daemon or browser automation via shell. Use fictional records only. Capture before/after evidence for reproduced failures, retest fixes, and record console/network issues where supported by the browser interface.

- Open canonical HTTPS URL in a new judge-like session. No loopback/secret configuration should be required for public review.
- Packaging fixture: 7-day delay, +20% demand, +25% freight, AED 24,000 floor. Verify 130 combinations; baseline 990/1,362 units, 9 stockout days; recovery 1,362/1,362, AED 7,887.50 spend, AED 28,112.50 minimum cash. The final engine may revise numbers only with an explained model/fixture change and consistent deck updates.
- Toggle stock/cash and open the 30-row daily table; chart and table must agree. Closing cash may exceed intraday minimum; the UI must not imply they are identical.
- Open review dialog. Check focus, unchecked disabled confirmation, explicit approval, loading/duplicate prevention, successful persisted evidence and return focus on Escape. Refresh, reopen evidence and cancel; verify audit order and cancellation persistence.
- Switch all three SMEs, run a materially different scenario, ensure previous SME plans never appear under the new SME. Switch tabs repeatedly/back-forward where meaningful and test reload.
- Import invalid JSON/non-synthetic/wrong-tenant/stale synthetic inputs and verify the promised consequences. Download/export and parse the result independently; verify no auth/session material.
- Test reset cancellation and explicit confirmation; reset only the chosen SME. Test recoverable network failure with a useful retry state and no false success.
- Check 320×740, 375×812, 390×844, 768×1024, 844×390 landscape and 1440×1000. Check populated plans, the longest names/numbers, review dialog, table containment, fixed bottom navigation and safe areas. Check keyboard-only navigation, visible focus, reduced motion and a 200% text/zoom reflow where supported.
- Capture final phone/desktop screenshots. Report device/browser emulation truthfully; actual iOS/Android hardware and assistive technology require separate validation if not exercised.

## Performance benchmark

Apply the requested gstack benchmark principle: measure rather than guess. No percentage regression claim is valid without a comparable baseline. Do not claim Core Web Vitals or p95 from a single local timing.

| Measure | Collection / threshold | Interpretation |
| --- | --- | --- |
| Production frontend bytes | Sum compressed JS/CSS first-load responses or record built asset sizes. Proposed initial budgets: JS <500KB, CSS <100KB, total transfer <2MB, <50 requests. | Record whether sizes are transferred/compressed or raw disk bytes. They are not interchangeable. |
| Browser navigation | Where CUA supports performance entry access, record TTFB/FCP/LCP/DOM/load with browser, cache and network conditions. Proposed FCP <1.8s and LCP <2.5s. | Otherwise mark unavailable; do not synthesize metrics from screenshots. Human observation can report usability, not a numeric web-vitals score. |
| Default scenario API | Repeat at least 20 sequential requests in a retained workspace, report p50/p95/max, status and region/client conditions. | End-to-end response includes network/object contention, not just engine CPU. Use low bounded load on the owner-authorized demo. |
| Worst bounded scenario | Exercise max 3 suppliers and up to 20 quantity choices each (8,000 combinations); record engine and deployed API duration. | Preserve fixture limits and failure behavior. A few requests do not establish 40,000-customer scale. |
| Approval correctness under overlap | Concurrent duplicate and different-proposal calls; inspect resulting draft/audit counts. | A functional invariant, not a throughput benchmark. |
| Future regression gate | Same setup: >20% timing change warning; >50% or >500ms increase regression; JS/CSS >10% warning and >25% regression. | Compare cold and warm separately and inspect noisy network observations before attribution. |

No final performance grade or QA health score is assigned by this source-only review. A weighted score without browser evidence would hide untested categories. Save actual final results in a separate immutable report, with known limitations and links to screenshots/logs.

## Judge presentation checks

- Cover gives product promise, selected track, repo link and deployed demo link without a long disclaimer.
- First three slides establish the owner problem, decision and working solution. Show one legible real-app visual and one accurate synthetic outcome.
- Integration roadmap states phases, inputs, outputs and release gates; proposed connector access is not described as already connected.
- Pilot slide shows 160 target SMEs, minimum 150 enrolled, four waves, baseline/comparison/analysis timeline and accountable recruitment roles. KPI slide distinguishes target from measurement and guardrail.
- Scale slide separates today's capped demo from the 40,000-SME architecture and measured expansion gates.
- Closing slide asks for the next concrete sponsor action and explains the pilot value. It does not claim guaranteed challenge selection, acceptance or a win.
- All formats share the same links, scenario numbers, terms and narrative. Update speaker notes/script to avoid reverting to old deadline prose or the former local/Hostinger deployment description.
