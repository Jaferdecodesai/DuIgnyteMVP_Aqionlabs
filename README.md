# Aqion Relay — ResilienceTech MVP

A mobile-friendly business resilience workbench for the du–Ignyte ResilienceTech concept.

## Open the MVP and documents

| Resource | Open or download |
| --- | --- |
| **Live MVP** | **[duignytemvp.aqionlabs.workers.dev](https://duignytemvp.aqionlabs.workers.dev)** |
| **Pitch deck** | [Interactive HTML](https://duignytemvp.aqionlabs.workers.dev/pitch/) · [PDF](Aqion-Relay-Du-Ignyte-Pitch.pdf) · [Editable PowerPoint](Aqion-Relay-Du-Ignyte-Pitch.pptx) · [Offline HTML](Aqion-Relay-Du-Ignyte-Pitch.html) |
| **System architecture** | [Read in GitHub](ARCHITECTURE.md) · [Editable Word document](Aqion-Relay-System-Design.docx) · [PDF](Aqion-Relay-System-Design.pdf) |
| **Deployment and validation** | [Cloudflare runbook](docs/CLOUDFLARE.md) · [Renamed release checks](evidence/RENAMED_RELEASE.md) · [GitHub Actions](https://github.com/Jaferdecodesai/DuIgnyteMVP_Aqionlabs/actions) |

The pitch and architecture files are at the repository root for quick access. The pitch shows the live MVP and GitHub URLs on the cover, Working MVP and closing slides. The dashboard image opens the live MVP, and the architecture slide links to the editable system design. All slides use **aqionlabs.ai** branding at the top right.

Live MVP: [AqionRelayDuMVP](https://duignytemvp.aqionlabs.workers.dev). [Open the pitch](https://duignytemvp.aqionlabs.workers.dev/pitch/).

Source repository: [DuIgnyteMVP_Aqionlabs](https://github.com/Jaferdecodesai/DuIgnyteMVP_Aqionlabs). Next.js App Router + React + TypeScript run on Node.js 24. No Python runtime or external AI service is required.

**Synthetic demonstration.** Three fictional SMEs, suppliers and operational histories are included. The numerical forecast fits synthetic observations; explanations use deterministic templates. Approvals create unsent drafts. No supplier order is transmitted and no money moves. du APIs, banking and ERP connections remain proposed.

## Run locally

Use Node **24.x** and npm. The repository rejects unsupported Node major versions.

```sh
npm ci
cp .env.example .env.local
```

Generate a random value for `SESSION_SECRET` and replace the placeholder in `.env.local`:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
npm run dev
```

Open **http://127.0.0.1:4633**. Keep the same origin and signing secret to restore the browser workspace after a process restart. Sessions expire after seven days; private browsing, cookie removal or a changed secret creates a separate workspace. This is anonymous demo isolation, not business identity or customer account authentication.

```sh
npm run check
npm audit --audit-level=moderate
npm run build
npm start -- --port 4633
```

The local Node production preview needs the loopback-only settings in `.env.local`. The deployed Cloudflare app uses HTTPS, a stable signing secret and a native SQLite-backed Durable Object. `npm start` listens on `0.0.0.0` and accepts the hosting `PORT` environment variable. A secure local-only preview can use `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 4633`.

## Try the complete workflow

1. Select **Coastline Packaging** and run the default scenario: seven days of delay, 20% demand increase, 25% freight increase and AED 24,000 cash floor.
2. Compare the baseline and four recovery options. Inspect stock/cash charts and the exact 30-day table.
3. Review the recommended option, check the owner confirmation box and create an **unsent synthetic draft**.
4. Open **Evidence** to export the source, proposals, drafts, calculation versions and audit history. Cancel a draft to allow another decision.
5. Open **Connections** to inspect sources, download the JSON format, import edited fictional data or reset the selected SME. Imports invalidate earlier proposals.
6. Open **Pilot** to inspect the proposed 160-SME/four-wave strategy. No partners or measured benefits are claimed.

The default fixture evaluates 130 combinations. Its recommended 400-unit Oasis purchase costs AED 7,887.50, fulfills 1,362 units versus 990 without recovery, and preserves minimum cash of AED 28,112.50. These are reproducible synthetic calculations, not commercial results.

## Deployment and handoff

Use the contents of **this directory as the GitHub repository root**, including dotfiles. Do not upload the parent challenge workspace. `.github/workflows/ci.yml` installs from the lockfile, checks types, runs tests and coverage, builds, and audits dependencies. The workflow runs on pushes and pull requests. Check the [Actions page](https://github.com/Jaferdecodesai/DuIgnyteMVP_Aqionlabs/actions) for the result for each commit.

Follow [the Cloudflare runbook](docs/CLOUDFLARE.md) for the verified Workers deployment, assets, native SQLite persistence, secrets and rollback. The earlier [Node/MySQL runbook](docs/HOSTINGER.md) is an optional alternative; it is not the deployed architecture.

Local Node development uses SQLite. Cloudflare uses native Durable Object SQLite with synchronous atomic transactions. The optional Node hosting adapter uses MySQL/MariaDB. The demo is bounded to 200 anonymous workspaces, 100 undrafted proposals plus draft references, 200 drafts and 200 audit entries per SME, and 1.5 MiB per workspace. Supporting 40,000 SMEs requires identity, normalized tenant storage, distributed rate limiting, workers, observability and load testing; this MVP does not claim that capacity.

The refined 14-slide pitch is in [pitch/](pitch/): editable PPTX, searchable PDF, offline editable HTML, shared scene source and speaker notes. Both repository and verified live demo links appear on slide 1. The original `du-relay` research package is preserved separately. Competition submission remains separate from GitHub publication and hosted deployment.

## Evidence and technical notes

- [Current release checks](evidence/RENAMED_RELEASE.md), with the [historical Node validation](evidence/VALIDATION.md) retained separately.
- [TDD record](evidence/TDD.md), [engine TDD record](evidence/TDD_ENGINE.md).
- [API contract](docs/WEB_API.md), [architecture/security review](docs/ARCHITECTURE_REVIEW.md).
- Design: calm teal/off-white palette, responsive grid, bottom phone navigation, safe-area spacing, native confirmation dialogs, visible focus, reduced-motion support and a table alternative for charts. System fonts and local SVG assets require no third-party requests.
- `src/lib/engine.ts` owns calculation/validation; `service.ts` owns atomic decisions; `security.ts` owns session/origin/CSRF checks; storage adapters persist one document per workspace. The browser never chooses its workspace storage key.

This is a responsive web app with home-screen metadata; offline operation, native iOS/Android packaging and push notifications are not implemented. No project ownership/license representation is added; third-party dependencies retain their respective licenses.
