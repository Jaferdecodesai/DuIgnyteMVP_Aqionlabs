# Cloudflare Workers release

Verified public URL: **https://duignytemvp.aqionlabs.workers.dev**. Worker name: `duignytemvp`. The requested leading words use lowercase because DNS hostnames are case-insensitive.

## Architecture

Node 24 builds a genuine Next.js static export in an isolated `.cloudflare-build` directory. `scripts/build-cloudflare.mjs` copies the frontend without environment files or the Node-only API adapter. A native Worker serves those assets and forwards API requests intact to the `RelayWorkspace` Durable Object. The existing API handler, numerical engine and domain service run inside that object. Native SQLite `transactionSync` atomically checks versions, creates drafts and writes audit records. No Python, local filesystem database or MySQL server is used by the Cloudflare deployment.

`wrangler.jsonc` declares the assets binding, canonical origin, native SQLite class and migration. Do not rename the class, migration or `idFromName("relay-demo-v1")` to perform a routine update; they identify the retained database. A stable signing secret and cookie are also needed to restore a browser workspace.

## Reproduce and deploy from GitHub source

```sh
git clone https://github.com/Jaferdecodesai/DuIgnyteMVP_Aqionlabs.git
cd DuIgnyteMVP_Aqionlabs
npm ci
npm run check
npx wrangler login
npm run build:cloudflare
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

Use an independent random secret of at least 32 characters. Never commit it. The existing release has a configured secret; routine deployments retain it. For a new account, change `name` and `APP_ORIGIN` to that account's actual Workers URL before deployment. Login or account setup may require owner interaction. This runbook does not authorize plan upgrades or payments.

For local native-runtime preview, create an ignored `.dev.vars` with `SESSION_SECRET`, `APP_ORIGIN=http://127.0.0.1:4650`, `RELAY_WORKER_LOCAL=true`, and `RELAY_WRITES_ENABLED=true`. Run `npm run preview:cloudflare`. Local HTTP is permitted only for an explicitly enabled loopback preview.

## Verify

```sh
node scripts/smoke-cloudflare.mjs https://duignytemvp.aqionlabs.workers.dev
```

The smoke script exercises real HTTP and native storage, including session isolation, origins/CSRF, the default 130-combination calculation, duplicate approvals, imports, cancellation, reset and export. It leaves one fictional draft in a separate test workspace and stores its credentials only in ignored `.data/`. Reports omit authentication material. Repeat with care: 200 workspaces and per-minute mutation limits intentionally bound the public demo.

The release was also tested in the deployed browser on phone, tablet, desktop and landscape widths. Evidence is recorded in `evidence/FINAL_RELEASE.md` and `evidence/CLOUDFLARE_SMOKE.json`.

## Operational bounds and rollback

This synthetic demonstration holds at most 200 anonymous browser workspaces, retained for seven days; each document is capped at 1.5 MiB. One singleton coordinator preserves cross-request approval integrity. Rate counters are best effort per running object instance. This is not the proposed 40,000-SME architecture: authenticated tenant/SME sharding, distributed limits, queues, approved data processing, restore tests and load acceptance are pilot gates.

Use `npx wrangler deployments list` and `npx wrangler rollback <version-id>` for an explicitly chosen code rollback. Keep storage migrations compatible; code rollback does not undo persisted business data. Never delete the Durable Object namespace to update the application. Pause writes with `RELAY_WRITES_ENABLED=false` and redeploy if required; GET state/export remain available. Restore acceptance and enterprise incident operations must be agreed before real data or external writes.

Public release assets include `/pitch/`, `/pitch/Aqion-Relay-Du-Ignyte-Pitch.pdf` and `/pitch/Aqion-Relay-Du-Ignyte-Pitch.pptx`. They contain no real SME data. The app creates unsent drafts only.
