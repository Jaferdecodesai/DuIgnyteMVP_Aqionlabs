# Final Cloudflare and pitch release — 16 October 2026

Live app: https://aqionrelaydumvp.jafermn.workers.dev

Public source: https://github.com/Jaferdecodesai/Relay_IgnyteDuChallenge

Published pitch: https://aqionrelaydumvp.jafermn.workers.dev/pitch/

## Verified scope

The refined mobile web MVP, native Cloudflare API/storage adapter and 14-slide presentation are complete. The selected track is ResilienceTech. The deck includes the concept, working decision flow, reproducible synthetic result, actual deployed screenshot, integration architecture and eight-week roadmap, proposed 160-SME pilot in four waves, KPI targets, risks/controls, commercial proposal, scale gates and a concrete du sponsor ask. The requested closing-date/login sentence is absent. No customer, revenue, provider connection or pilot outcome is invented.

## Automated checks

- Node 24.19.0; `npm run check` passed: strict TypeScript, **127 tests in 10 files**, coverage, Node production build, genuine Next.js static export and Wrangler deployment dry run.
- Core-library coverage: **93.71% statements, 88.59% branches, 99.22% functions, 94.26% lines**. This configured coverage report measures `src/lib`; it does not claim coverage of every UI/Worker line.
- `npm audit --audit-level=moderate`: **0 vulnerabilities** at verification.
- Native Worker startup passed on Cloudflare. Final deployed Worker version: **f3617797-bdc3-48d8-b636-5a4d2ad75d95**. Assets and source are built from this release's app code and pitch assets; later report-only changes do not change the deployment.
- The reusable HTTP smoke suite passed **11 groups** in both local workerd and the actual public deployment. It covers native SQLite readiness, shell/API routing, signed cookie flags, workspace isolation, Origin/CSRF rejection, reference calculations, foreign-proposal/unchecked-confirmation rejection, concurrent duplicate approvals, evidence export, cancellation, invalid import retention, source-version invalidation, stale-source blocking and reset confirmation. See `CLOUDFLARE_SMOKE.json`.
- A retained session created a draft before redeployment and read the same draft afterward, with exactly one approval audit entry. The deployed PDF, PPTX and HTML were downloaded over HTTPS and SHA-256 matched to local release assets. See `CLOUDFLARE_DEPLOYMENT.json`.
- Twenty sequential 130-combination scenario API requests from the owner's workstation returned 200: **p50 184 ms, p95 274 ms, maximum 513 ms**, including network. This is a bounded functional timing sample, not a concurrency/load test, Web Vitals score, 40,000-SME capacity result or comparison against a previous baseline. See `CLOUDFLARE_BENCHMARK.json`.

## Browser checks

Codex in-app browser, actual HTTPS deployment:

- One-click challenge scenario produced 130 combinations, baseline 990 units served and recommended 1,362 units served, AED 7,887.50 spend, minimum cash AED 28,112.50 against AED 24,000 floor.
- Owner review displayed quantities, fictional supplier terms, cash floor and recovery spend. The save button stayed disabled until the owner confirmation was checked. Saving created an unsent draft, visible after browser reload. Cancellation updated the evidence timeline.
- Stock/cash toggle and 30-day data table worked; the table had 30 data rows plus its header. Daily values were consistent with the reference scenario.
- Evidence and populated plans/open table were checked at **320×740, 375×812, 390×844, 768×1024, 844×390 and 1440×1000**. Document width matched viewport width at every size; the wide table remained in its own scroller. See `RESPONSIVE_CHECKS.json`.
- The HTML deck passed Next/slide-dot navigation, editing, local save, reload restoration and portable HTML download. QA edits were restored to the final copy. All 14 slides were checked for overflowing text at **1440×1000, 1024×768, 390×844, 844×390 and 320×740**; no text-box or horizontal document overflow was found. No warning/error logs were reported on the published deck. See `PITCH_BROWSER_QA.json`.
- These checks use browser viewport emulation. Actual iOS/Android hardware, screen readers and enterprise accessibility acceptance were not exercised.

## Presentation integrity and visual review

- Final PDF: **14 pages** with searchable text and two correct clickable cover link annotations.
- Final PPTX: intact ZIP, **335 editable text runs**, native shapes and notes, and the two correct cover hyperlink relationships. The real app screenshot is an embedded image; the surrounding slide is editable.
- PDF: **180,703 bytes**; PPTX: **539,792 bytes**; self-contained HTML: **542,618 bytes**. Every file is below the supplied 40 MB per-file limit.
- Every final PDF slide was rendered and inspected. The native PPTX was independently rendered through LibreOffice with the included fonts and all 14 slides were inspected. Final contact sheets are under `pitch/renders/` and `pitch/evidence/native-render/`.
- HTML embeds font/image data and has no external asset dependency. PowerPoint uses the included font files; install them for consistent native rendering. The fonts' SIL Open Font License texts are included.

## Operational boundaries

All data is fictional. Forecasting uses fitted numerical models and a visible comparator; explanations use deterministic templates. Approval saves an unsent draft. No supplier order, ERP write or funds movement occurs. Anonymous sessions are bounded demo isolation; authenticated tenant IAM, approved data processing/location, connector credentials, outbox/reconciliation, restore acceptance and scale/load tests remain explicit pilot gates.

The public demo is capped at 200 workspaces, seven-day retention and 1.5 MiB per workspace. It is not a completed 150+ partner pilot or a demonstrated 40,000-customer deployment. The pitch's percentages are prospective targets, clearly separated from synthetic simulation outputs.

Publication and deployment are verified technical deliverables. Ignyte registration, upload and a submission receipt are separate owner actions; no submitted entry is claimed.
