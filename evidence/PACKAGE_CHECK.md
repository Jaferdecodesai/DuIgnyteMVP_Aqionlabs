# Clean source and archive check

16 October 2026.

A separate temporary source directory was created without `.env.local`, SQLite state, `node_modules`, `.next`, coverage, downloads or screenshots. `npm ci` succeeded from the supplied lockfile under Node 24.19.0 and reported zero vulnerabilities. After the final formatting and UI eligibility changes, the updated source was copied into that credential-free directory and the complete check was rerun:

```text
npm run check
TypeScript: passed
Vitest: 8 files passed; 108 tests passed
Production Next build: passed
```

The build did not require database credentials or a live service. The temporary directory remains a verification copy, not a second product or remote deployment.

`dist/Aqion-Relay-Node-MVP-source.zip` contains the repository-root source and dotfiles, test suite, environment example, deployment runbook and validation records. It excludes local secrets, database files, generated dependencies/builds, coverage HTML, browser downloads and screenshots. A SHA256 manifest inside the package covers every included file except the manifest itself. The ZIP's own SHA256 is supplied beside it. Packaging verifies CRC integrity, manifest hashes and exclusions and scans for the actual local signing secret without printing it.

The clean build verifies the same application source files packaged in the ZIP; this is not a claim that GitHub Actions or Hostinger executed them. Runtime output is intentionally not packaged because Hostinger builds from source.
