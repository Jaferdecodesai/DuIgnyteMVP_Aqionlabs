# GitHub → Hostinger deployment runbook

Prepared and source-checked 16 October 2026. This runbook is ready for the account owner. The source repository is [Relay_IgnyteDuChallenge](https://github.com/Jaferdecodesai/Relay_IgnyteDuChallenge); hosted database and deployment configuration remain separate steps.

## Account and source preparation

Hostinger documents managed Node.js apps on Business Web Hosting and Cloud plans, including Next.js and Node 24, with GitHub import and automatic deployment on pushes. Confirm the entitlement in your account before setup. [Official deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).

Create a repository containing only this app's directory contents. Retain `.github`, `.node-version`, `.npmrc`, `.gitignore` and the lockfile. Exclude `.env.local`, `.data`, `node_modules`, `.next`, coverage, downloads and local screenshots. The supplied source ZIP follows these exclusions.

Keep any repository or staging exposure within the supplied competition rules and obtain organizer clarification where needed. A private repository alone does not resolve the challenge's restriction on external sharing. This package grants no publication approval.

CI is configured for ordinary push/pull_request events with read-only repository permissions and no deployment credentials. Require a successful CI check before updating the branch used by Hostinger. Hostinger auto-deployment itself does not wait for this GitHub check: use a protected release branch and merge into it after validation. No workflow in this package pushes or deploys.

## Runtime settings

In hPanel: **Websites → Create Website → Web App → Import Git Repository**. Select the authorized repository and intended release branch. Use the Next.js server preset and confirm its detected fields against these application values:

| Setting | App value |
| --- | --- |
| Repository root | `.` when this folder is the repository root |
| Runtime | Node.js `24.x` |
| Dependency installation | `npm ci` where the panel permits a custom install command; otherwise confirm the lockfile is honored by the managed installer |
| Build | `npm run build` |
| Output, if requested | `.next` |
| Start, if requested | `npm start` |
| Port | Hosting-provided `PORT`; do not hardcode 4633 on the server |

This is a Next.js Node server, not a static export. Keep Next.js framework detection instead of inventing an entry file. The exact fields available depend on the current panel; if startup settings differ, verify the managed Next.js preset in the deployment log. Do not remove or replace an existing website to test this app; choose a new staging site/domain first.

## Environment variables

Enter these as server environment variables in hPanel. None uses a `NEXT_PUBLIC_` prefix.

| Variable | Hosted setting |
| --- | --- |
| `NODE_ENV` | `production` |
| `APP_ORIGIN` | Exact HTTPS origin, e.g. `https://relay.example.com`; no path |
| `SESSION_SECRET` | Independently generated random secret, at least 32 characters; use the README command locally |
| `DEMO_ACCESS_CODE` | Separate shared demo code for an invited demonstration; not customer identity |
| `RELAY_ALLOW_LOCAL_STORAGE` | `false` or unset |
| `RELAY_WRITES_ENABLED` | `true`, or `false` for an operator pause |
| `MYSQL_HOST` | Actual value from database settings |
| `MYSQL_PORT` | Actual port, normally `3306` |
| `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` | Actual database credentials |
| `MYSQL_TLS` | `true` by default, certificate verification enabled |

Set the origin to the actual temporary Hostinger HTTPS domain during staging. Change it when moving to a custom domain and redeploy/restart; a mismatched origin/host returns 403 for protected actions. Forwarded host/protocol headers are deliberately not trusted. If the managed proxy rewrites Host, obtain its documented trusted-proxy contract before changing application checks.

The supplied `.env.example` is for loopback development and must not be uploaded as hosted configuration. Keep a stable signing secret across releases. Changing the secret or access code invalidates existing sessions. Do not paste secrets into repository files, issues, screenshots or logs.

## MySQL persistence

Create a dedicated MySQL/MariaDB database and user in hPanel, then set the credentials above. Hostinger's guide describes database-panel credentials, environment configuration and `mysql2` pooling. This app includes its own adapter and schema creation. [Official Node/MySQL guide](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/).

The application creates `relay_workspaces` on readiness using InnoDB with a primary workspace key, JSON payload in LONGTEXT, and millisecond `updated_at`. The database user needs CREATE for first initialization and SELECT/INSERT/UPDATE/DELETE afterward. Readiness currently uses `CREATE TABLE IF NOT EXISTS`, so retain this permission or adapt schema bootstrapping before restricting it. No destructive schema migration runs.

Keep `MYSQL_TLS=true` for network databases. The app rejects unverified certificates; it does not silently downgrade. If Hostinger confirms that the database endpoint is on the same private host and provides no TLS listener, explicitly set `MYSQL_TLS=false` only for that provider-confirmed boundary. Do not apply this setting to an untrusted or remote network. Connection and certificate behavior still require a real account test.

Do not put SQLite in the deployment directory. Hostinger documents versioned `hbuilds/versions` releases with a `current` symlink and managed files replaced on deployment. Database state must survive those code releases. [Official file-layout documentation](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).

## After deployment

1. Check the deployment log for Node 24, dependency installation and successful Next build/start. Record the deployed Git SHA without printing environment secrets.
2. Visit `/api/health`: require HTTP 200 and `storage: "mysql"`. It must return a safe 503 if configuration/database readiness fails. `/api/health?live=1` is a process probe after successful runtime initialization; cold initialization still requires valid configuration and storage.
3. Use two browser profiles: each opens its own anonymous workspace. If enabled, enter the shared demo code. Cookie must be HttpOnly, SameSite Strict and Secure under HTTPS.
4. Run the default scenario. Review the recommended 400-unit plan and explicitly confirm one unsent draft. Refresh, restart the hosted process, and verify the draft persists in the same browser. The second profile must remain empty.
5. Export evidence. Confirm synthetic disclosure, one draft and no cookie/CSRF/credential fields. Cancel the draft. Test an edited synthetic JSON import and reset in the disposable demo workspace.
6. Test phone portrait/landscape, keyboard dialogs and the exact daily table. Check all assets, refreshes and API actions under the final origin. Test HTTP→HTTPS handling and confirm no page content or API responses are cached across users.
7. Set `RELAY_WRITES_ENABLED=false` and restart to test the pause: an existing workspace can read/export and calculate without saving a proposal. Approval, cancel, import, reset and new workspace creation must return 503 without writes. Restore `true` only when ready for the demonstration.

Record these hosted results separately from the included local validation. Passing local adapter protocol tests does not verify Hostinger connectivity, real database locking or deployment persistence.

## Operations and rollback

Back up the dedicated database through hPanel before a release; verify restoration into a separate database before relying on the backup. Synthetic workspace exports aid inspection but are not full database backups. Stale workspaces are pruned after seven days of inactivity when a new workspace is initialized. There is a 200-workspace cap; cleanup does not run during a write pause. Read activity does not extend retention.

Use `RELAY_WRITES_ENABLED=false` plus restart as a saving pause. This does not prevent existing reads/calculations. For an access problem, change the demo code to invalidate sessions and stop invitations while diagnosing. Rate limits are process-local; additional instances need a shared limiter and hosting-edge protection.

For a code rollback, redeploy the last verified Git revision through the supported panel/repository flow. Keep the same database, canonical origin and signing secret. The current schema is additive initialization only and compatible with this MVP's previous revision; future schema changes need an explicit migration/rollback plan. A failed rollout must never trigger automatic fallback to SQLite.

Before real SME data or enrollment, add tenant accounts/roles, consent and deletion controls, encrypted backup/restore operations, provider integration authorization, monitoring, capacity validation, and a reviewed data-governance model. The present demo cap is unrelated to the challenge's future 40,000-SME ambition.
