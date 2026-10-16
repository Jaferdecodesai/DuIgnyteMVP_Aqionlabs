> Historical Node/MySQL baseline. The current deployed release is Cloudflare Workers with native Durable Object SQLite; see [final validation](FINAL_RELEASE.md) and [Cloudflare runbook](../docs/CLOUDFLARE.md). The current document cap is 1.5 MiB.

# Validation — Node web MVP

Verified locally on 16 October 2026 before GitHub publication. This records those observed local checks and their limits. Current remote checks are available on the repository Actions page. The prior Python application and challenge pitch package were preserved.

## Automated checks

| Check | Observed result |
| --- | --- |
| Runtime | Node 24.19.0 |
| TypeScript | `npm run typecheck` passed |
| Vitest | **108 tests passed across 8 files** |
| Production | `npm run build` passed; Next.js 16.4.2 App Router server/API |
| Dependency audit | `npm audit --json`: **0 known vulnerabilities**, including development dependencies, at check time |
| Real production HTTP routes | **14 checks passed**, optimized Next server on loopback with SQLite |
| Default calculation | 130 combinations; 990 baseline units fulfilled; 1,362 recommended; AED 7,887.50 recovery spend; AED 28,112.50 minimum cash |
| Maximum bounded search | Engine test enumerates 8,000 combinations under a two-second development-host budget |
| MySQL | Five injected-driver transaction protocol tests passed; no live database |

Core-library V8 coverage (`src/lib/**/*.ts`, excluding types): **93.72% statements, 88.59% branches, 99.22% functions, 94.27% lines**. These percentages do not instrument CSS or all browser-component code. The component has 15 interaction tests in jsdom plus browser verification below. MySQL adapter branch coverage is 50%; protocol tests are not a substitute for actual database error/locking behavior.

Tests include source validation, finite/bounded values, supplier approval and expiry, same-day cash timing, stale sources, no-improvement cases, canonical hashes, forecast comparison, session tampering/expiry, origin/CSRF, access gate, isolation, race/idempotency, imports/reset, write pause, bounded storage and safe errors. See [test-first record](TDD.md) and [engine record](TDD_ENGINE.md).

The initial standalone HTTP smoke script expected a 400 for an unknown workspace proposal; inspection confirmed the documented conflict status is 409. Correcting that assertion produced a passing 14-check run; no application behavior was changed for this assertion. Raw safe results are in `http-smoke.json`.

## Browser workflow

Tested in the Codex in-app browser against the optimized production build at `http://127.0.0.1:4633/`, using fictional data only:

- Default scenario → stock/cash comparison → explicit owner review → saved unsent draft → evidence export → cancellation.
- Reviewed numerical output and supplier quantities/terms against the reference calculation.
- Downloaded evidence file parsed independently: synthetic flag, one unsent draft and AED 7,887.50 spend verified; no session, CSRF or credential fields found.
- Cancellation and audit history survived a Next process restart and page reload with a stable secret and the same browser session.
- Downloaded sample JSON; malformed file rejected without import; valid synthetic file imported successfully; confirmed selected-SME reset restored the fixture.
- Readable recovery timeline shows newest entries first. Raw source hashes remain in the evidence export rather than timeline descriptions.
- Phone owner-review dialog takes focus on opening; unchecked confirmation disables saving. Escape closes the dialog and restores focus to the Review plan button.
- At 375×812, a real dialog overflow was reproduced (397px scroll width inside 335px client width). After the wrapping fix, both widths are **335px**. At 844×390 landscape, both are **708px**, and the 358px dialog height fits the viewport with vertical scrolling for its contents.
- Stock/cash switch and exact 30-row projection table work. The table scrolls inside its labeled region without page overflow.
- An intentionally imported 25-hour-old homeware snapshot visibly blocks all owner-review buttons; restored the original synthetic fixture afterward. Cash-feasible options without service improvement are also disabled in the interface, matching server approval rules.
- Final browser console check returned no errors or warnings.
- Bottom navigation changes view and returns the page to scrollY 0 with main content focused.

The overview, including populated plan cards, has no horizontal page overflow at the following viewport sizes. Raw measurements are in `responsive-matrix.json`.

| Width × height | Document scroll width | Page overflow |
| --- | --- | --- |
| 320 × 740 | 320 | No |
| 375 × 812 | 375 | No |
| 390 × 844 | 390 | No |
| 768 × 1024 | 768 | No |
| 844 × 390 | 844 | No |
| 1440 × 1000 | 1440 | No |

Saved screenshots are local evidence under `evidence/screenshots/`; the clean source ZIP excludes them. Native dialogs, visible focus, semantic controls, reduced-motion CSS, safe-area spacing, no zoom restriction and a chart table alternative are implemented. This is not a formal WCAG certification. Actual iOS Safari/Android Chrome hardware, assistive technology, OS text-size settings and offline behavior were not tested.

## Deployment boundary

No GitHub push, Actions execution, Hostinger account configuration, public deployment or challenge submission is claimed. Node 24/Next.js/GitHub support was verified from current official Hostinger documentation and encoded in the runbook. The GitHub Actions references were checked against their official v7 tags and pinned to those commit SHAs; the workflow has not run remotely.

Hosted MySQL connectivity, certificate/localhost behavior, proxy Host preservation, restart persistence on Hostinger, database backup restoration and a final-domain smoke test require the owner's hosting environment. The adapter fails closed without hosted configuration and does not fall back to SQLite. The shared demo access code is not tenant identity. No 40,000-customer performance, enrollment, real business savings or live provider operation is claimed.

The clean source archive excludes secrets, SQLite data, generated builds, dependencies, coverage and browser downloads. SHA256 manifest and ZIP CRC checks are generated during packaging. See `PACKAGE_CHECK.md` for the independent clean-source verification.
