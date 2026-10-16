# Numerical engine: observed test-first evidence

Scope: `src/lib/engine.ts`, `types.ts`, `fixtures.ts`, `tests/engine.test.ts`. The original Python application and fixture input JSON were read only. No network services or customer data were used.

## RED

The typed interfaces and behaviorless exported stubs were created first. The first five behavioral tests were executed before implementing hashing, validation, forecasting, quantity selection or simulation:

```text
> vitest run tests/engine.test.ts
Tests 5 failed (5)
hashes nested key ordering reproducibly using SHA256:
  AssertionError: expected '' to match /^[a-f0-9]{64}$/
validates snapshots by value without modifying input:
  Error: Not implemented
fits weekday trend regression with chronological holdout:
  Error: Not implemented
reproduces the fictional packaging recovery and conserved inventory:
  Error: Not implemented
limits each supplier to twenty including zero quantity:
  AssertionError: expected [] to have a length of 20 but got +0
```

Before implementing the functions, the test cases were expanded to cover nonfinite/boolean/out-of-range inputs, real dates, dangerous object keys, supplier approval/expiry, forecast fallback and seasonal comparator, daily cash timing, stale input, zero-improvement cases and bounded enumeration. Observed second RED run:

```text
> vitest run tests/engine.test.ts
Tests 45 failed (45)
Duration 134ms
```

Failures were missing behavior (`Not implemented`, empty hash or quantity output), not import/compile failures. The validation assertions expected field-specific errors and therefore also failed against the unimplemented stubs. The implementation was then written to meet those behavioral requirements.

## GREEN and coverage

```text
> vitest run tests/engine.test.ts
Test Files 1 passed (1)
Tests 45 passed (45)
Duration 545ms
```

Scoped coverage command:

```sh
npm test -- tests/engine.test.ts --coverage --coverage.include=src/lib/engine.ts --coverage.include=src/lib/fixtures.ts
```

Observed V8 coverage for the numerical engine:

| Measure | Result |
| --- | --- |
| Statements | 98.57% (208/211) |
| Branches | 96.85% (154/159) |
| Functions | 100% (57/57) |
| Lines | 100% (129/129) |

This is scoped engine coverage; the lead workflow separately measures full application coverage. The worst-case 8,000-combination calculation test completed with the entire engine test suite in 446ms under coverage on this development host. The test threshold is two seconds, not a hosted performance claim.

## Reproduced fictional reference

Default scenario `{delay:7,demand:20,freight:25,cash_floor:24000}` with the packaging fixture:

| Result | Verified value |
| --- | --- |
| No-purchase units fulfilled | 990 |
| No-purchase lost units | 372 |
| No-purchase stockout days | 9 |
| Recovery units fulfilled | 1,362 |
| Selected order | 400 units from fictional Oasis |
| Recovery spend | AED 7,887.50 |
| Minimum projected cash | AED 28,112.50 |
| Evaluated combinations | 130 |
| Regression holdout MAE | 1.28 |
| Seasonal-naive holdout MAE | 2.07 |

The model is an actual eight-feature ridge fit with partial-pivot Gaussian elimination and a chronological 14-day holdout. The seasonal comparator repeats only the final seven training observations. If the comparator has lower error it is selected; short/constant histories use an explicitly labeled trailing-average planning assumption. This is not a live generative model or an independently validated demand model.

`weekday-trend-ridge.node.v1` and `daily-conservative-enumeration.node.v1` identify this runtime port. Hashes use SHA256 over recursively sorted object keys with UTF-8 native JSON string/number encoding. Numeric `1` and `1.0` serialize identically in JavaScript; Unicode uses native JSON encoding. Therefore hashes and plan identifiers are reproducible within this Node versioned format and are not claimed identical to Python's JSON encoding. Forecast integer rounding uses half-even behavior to preserve the reference numerical examples.

Validation returns a detached, explicitly constructed snapshot, preserves literal text for React escaping, rejects unsafe object keys, and retains the validated optional import revision. Quantities retain the smallest eligible pack and full pack-aligned capacity while sampling at most 19 nonzero choices; three suppliers therefore evaluate at most 8,000 combinations including no purchase. Infeasible and stale scenarios retain evidence but never receive a recommendation.

Type checking was run after engine implementation. No engine errors were reported; at that point unrelated UI test work in progress contained five unsupported `exact` query options, reported to the owning lead without modifying their files.
