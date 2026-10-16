# Test-first development record

16 October 2026; Node 24.19.0, Vitest 4.1.11. Behavior tests were written in bounded feature batches against deliberately unimplemented functions before their implementations. RED failures were observed, implementations added, then GREEN tests rerun. This is the recorded workflow, not a claim of a separate RED/GREEN cycle for every helper function.

| Feature batch | Observed RED | Observed GREEN |
| --- | --- | --- |
| Session/origin/CSRF/access/limits | 9 missing-behavior failures | 9 passed |
| SQLite transactional storage | 6 missing-behavior failures | 6 passed |
| Isolated decision service | 13 missing-behavior failures | 13 passed |
| MySQL connection protocol | 5 missing-behavior failures | 5 passed, injected driver only |
| HTTP handler | 12 failures, including assertions on placeholder 501 responses | 12 passed |
| Numerical engine | 45 failures before implementation | 45 passed; separate engine evidence file |
| Browser component | Initial stub RED, then behavior tests before full component | 11 passed |
| Cold initialization and readable timeline | 3 runtime failures (501 versus 200/503) plus 1 UI order/wording failure | 15 passed in focused runtime + UI run |

Navigation regression: observed one failure because scrollTo was never called; implemented top-of-view navigation and retested. Phone browser inspection also reproduced a 397px scroll width inside a 335px dialog. The wrapping fix is checked in the browser.

Final combined suite: **108 tests across 8 files passed**. Full type checking and optimized Next build passed. Coverage instruments `src/lib/**/*.ts` excluding types; it does not claim CSS coverage or complete browser-component coverage. UI interaction tests run in jsdom, supplemented by actual browser checks recorded in VALIDATION.md. MySQL tests check protocol/locking calls through an injected driver; no live MySQL server was used.

The original Python prototype is preserved. The new engine reproduces its deterministic fixture calculations; Node-specific hash/model version labels avoid falsely asserting binary/hash parity with Python serialization.

Final UI eligibility regressions: two new tests first failed on misleading no-feasible wording and enabled review for a non-improving option. The corrected interface labels no eligible recommendation and disables no-improvement review; server enforcement already rejected those plans.
