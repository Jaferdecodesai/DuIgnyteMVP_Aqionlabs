# Refinement TDD evidence

16 October 2026. Existing engine/API regression tests were retained.

- Three new interface tests first failed for the missing one-click challenge walkthrough, scenario presets and recommendation delta. The refined UI then passed all 18 component tests.
- Six native storage contract tests first failed with no Cloudflare adapter. The synchronous SQLite adapter then passed persistence/isolation, transactional read-check-write, rollback, unknown-workspace, document-cap and 200-workspace/expiry cases.
- Configuration/routing tests first failed with no Worker implementation. Configuration, routing and the real-handler integration case then passed 15 focused Cloudflare tests, including concurrent duplicate approval and a new coordinator instance reading saved state.
- A new document-cap regression first failed because the previous 2 MiB cap accepted a 1.6 MB padded document. A shared 1.5 MiB cap fixed it, leaving headroom below Cloudflare's native row limit. The focused storage/service/Cloudflare suite then passed.
- The final full suite passed 127 tests. Native workerd and deployed HTTP/browser verification are recorded separately; Node test adapters alone do not establish production Worker behavior.
