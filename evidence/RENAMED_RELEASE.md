# Renamed release validation

Verified 16 October 2026. This report supersedes the earlier hostname and presentation package in `FINAL_RELEASE.md`. Historical timing samples remain labelled by their original URL and timestamp; they are not new-host performance claims.

## Published destinations

- Repository: https://github.com/Jaferdecodesai/DuIgnyteMVP_Aqionlabs
- Canonical MVP: https://duignytemvp.aqionlabs.workers.dev
- Public pitch: https://duignytemvp.aqionlabs.workers.dev/pitch/
- Public architecture Word/PDF: `/architecture/Aqion-Relay-System-Design.docx` and `.pdf` on the canonical MVP origin.

The account's `aqionlabs.workers.dev` subdomain was verified before deployment. Worker `duignytemvp` is the named deployment. The requested mixed-case hostname resolves through its lowercase DNS equivalent. This new Worker has a separate demo database/session scope; it is not a migration of an earlier anonymous workspace.

## Requested edits

- The existing public repository was renamed; local `origin` targets the new repository.
- All 14 slides show **aqionlabs.ai** at the top right.
- Slide 1 has two single-line label/URL rows. Both URL text boxes start at the same horizontal coordinate; the browser measured both at x=279 in the 1440-wide view.
- Slides 7 (Working MVP) and 14 (closing ask) include the new MVP and GitHub names/URLs in compact rows.
- Slide 7 uses a dashboard capture from the new deployment. Its image is hyperlinked to the MVP in PDF, PPTX and HTML. The actual published HTML image was clicked and opened the working app.
- Slide 8 links to the editable system design in the new GitHub repository.
- The supplied architecture document was updated, with all twelve topics retained and the technical content refreshed. It now has seven rendered pages, a current Cloudflare diagram, native SQLite transaction boundaries, actual request controls, storage/retention limits, release/rollback operations and pilot integration gates. The original attached path has the same updated DOCX; its previous contents were backed up in ignored local storage.
- Pitch PDF/PPTX/HTML, architecture DOCX/PDF and readable `ARCHITECTURE.md` are at the repository root. The README opens with direct links to the MVP, pitch and architecture.

## Verification

- Strict type checks, **127 tests**, coverage thresholds, Node production build, genuine static export and Wrangler dry run passed. Dependency audit reported **0 vulnerabilities**.
- The **11-group actual HTTPS smoke suite** passed on the new canonical URL. It covers routing, native SQLite readiness, signed cookies, Origin/CSRF rejection, isolated workspaces, reference calculations, foreign-proposal rejection, confirmation, concurrent duplicate approval, export, cancellation, invalid import retention, version invalidation, stale-source blocking and reset. See `CLOUDFLARE_SMOKE.json`.
- A draft and its single approval audit entry survived a same-namespace redeployment. Downloaded pitch and architecture files were SHA-256 compared with the root artifacts. See `CLOUDFLARE_DEPLOYMENT.json` for the deployed version and hashes.
- PDF annotations and PPTX relationships were checked for links on slides 1, 7, 8 and 14, including the image hyperlink. All PDF slides contain the new brand. DOCX hyperlinks and required current architecture terms were checked. See `ARTIFACT_LINK_QA.json`.
- Every final PDF slide and the independent native-PPTX render were visually inspected; edited slides 1, 7, 8 and 14 were inspected at full-slide size. All seven final Word/PDF pages were rendered and inspected for clipping, table fit, headers, footers and readable links.
- The HTML deck had no horizontal or text-box overflow across all 14 slides at 1440x1000, 1280x720, 390x844, 844x390 and 320x740. See `RENAMED_BROWSER_QA.json`.
- Each final output is below the supplied 40 MB per-file limit. `ARTIFACT_MANIFEST.sha256` covers the source/package files; runtime secrets and local data are excluded.

Synthetic data, numerical forecasts and owner-approved unsent drafts remain the public MVP scope. No supplier order, payment, live ERP/du integration, completed SME pilot or portal submission is asserted.
