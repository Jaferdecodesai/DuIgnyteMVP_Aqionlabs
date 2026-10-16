# Aqion Relay Node web MVP

Original build plan, 16 October 2026. The owner subsequently requested public GitHub publication as Relay_IgnyteDuChallenge; statements below about the original preparation-only scope are historical.

Scope: turn the existing local synthetic ResilienceTech workflow into a standalone mobile-friendly Node.js application that can be imported from GitHub into Hostinger. No external publication, repository push or hosting changes are required to prepare this deliverable.

## Requirements and acceptance

- Preserve scenario calculation, source validation, daily cash constraints, supplier terms, explicit draft approval, cancellation, import/reset, export, and audit.
- Browser-specific signed anonymous demo workspaces, isolated on every operation. Optional shared demo access code. Synthetic data only; no claim of business identity or production multi-tenant acceptance.
- Responsive React UI at 375/390/768/1440 and landscape, 48px touch targets, accessible dialogs/forms/charts/table alternatives, safe areas, reduced motion, clear loading/error/success.
- Real locally fitted numerical forecast. Synthetic fixture results must match the recorded Python reference. No Python runtime dependency in the new app. No live provider, supplier, banking or telecom integrations.
- Next.js App Router with TypeScript. Node24. SQLite development adapter, MySQL/MariaDB hosted adapter. Hosted mode must not silently write into release directories. No credentials needed to build.
- Same-origin/CSRF checks, payload bounds, session expiry, bounded requests, production configuration validation, safe errors, write-disable flag and readiness endpoint. Signed sessions require a configured production secret. Tokens never enter evidence exports or logs.
- Tests before new behavioral code, observed failing then passing. Core unit/integration coverage target80% minimum; report exact scope. API/invariant/concurrency/session checks plus browser functional/responsive QA and production build.
- GitHub Actions check pipeline, lockfile, .env.example, .gitignore, .node-version, deploy/rollback/database/backup runbook and clean source ZIP. No account credentials, data stores, dependencies, old challenge documents or generated build artifacts in the source ZIP.

## Architecture and contracts

One Next.js Node server, no Python subprocess. src/lib/engine.ts numerical behavior, src/lib/types.ts contracts, src/lib/fixtures.json copied fictional inputs. src/lib/storage.ts persistent transaction adapter. src/lib/service.ts workspace-bound domain transitions. src/lib/security.ts signed cookie, CSRF and configuration. src/lib/api.ts HTTP orchestration. src/app/api/[action]/route.ts delegates. Root shell uses Server Components; interactive workbench uses Client Components and React server-state fetching with explicit errors/loading.

Storage is one versioned document per anonymous workspace, addressed by a SHA256 token identifier. Transactions lock that workspace before version checks, draft creation and audit. SQLite uses BEGIN IMMEDIATE; MySQL SELECT FOR UPDATE inside the transaction; initialization uses a named capacity lock and an INSERT after the absence/capacity checks. No transactions span an external effect. Host deployment uses MYSQL_HOST/MYSQL_PORT/MYSQL_DATABASE/MYSQL_USER/MYSQL_PASSWORD as supported by Hostinger docs. MySQL TLS policy configurable but never disable certificate validation by default. Real hosted connection and hPanel settings remain owner verification.

GET /api/state?tenant=packaging initializes or restores signed HttpOnly SameSite session, returns state+csrf. All mutations POST same origin + X-Relay-CSRF. Existing action payloads retained. GET export scoped to the session; no security material. /api/health liveness/readiness with no secrets. POST /api/access optional access-code entry, no account registration. State includes workspace-local aggregate activity for a recovery timeline, not fictional SOC telemetry. Bounded demo data retention and cleanup documented.

## Sequence and ownership

1. Requirements/architecture/risk review (specialist, read-only) and shared contract.
2. Engine/type port with strict RED/GREEN record (engine worker).
3. Persistence/security/service/API with strict RED/GREEN (lead).
4. Responsive React UI and tests (frontend worker, own components/app only).
5. Integration, security review, source scan, dependency audit, production build and browser QA.
6. Hostinger/GitHub runbook, CI, package integrity and local preview.

The user-requested backend feature-development and app-builder skills explicitly authorize specialist coordination. Workers must not revert other work. No native-app implementation, SIEM integrations, external analytics, public repository, or actual hosting changes are added.

## Deployment source evidence

Verified official docs 16 October2026: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/ supports Next.js, Node24 and GitHub imports; https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/ describes environment-configured database connection. https://nextjs.org/docs/app/getting-started/deploying documents Node server deployment. Hostinger releases use new versioned directories; mutable SQLite data must not be placed inside them. Plan entitlement, actual DB connection, domain and deployment remain unverified.
