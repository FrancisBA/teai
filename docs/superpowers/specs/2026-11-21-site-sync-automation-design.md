# Site Sync Automation Design

## Intent

Keep the hosted `teai` copy in sync with the root app files without relying on someone remembering to copy three files by hand. A local command will regenerate the mirror on demand, and the Pages workflow will regenerate it again before every deployment.

## Goals

- Make root `index.html`, `resonance.js`, and `recording.js` the only files a developer needs to edit.
- Give developers a local command to refresh `site/` before committing or previewing.
- Guarantee the deployed artifact is rebuilt from the root sources on every Pages run.
- Keep the existing mirror-drift and self-containment tests in place.

## Non-goals

- No custom domain, backend, accounts, analytics, or cross-device storage sync.
- No change to the app's runtime behavior.
- No persistent live-URL test in CI; the deployed URL was already verified manually.
- No automation of the Android phone check; that remains a manual post-deploy checklist.

## Constraints

- Existing repo has no `package.json`; the local sync command will be `node scripts/sync-site.js`.
- `site/` remains committed because the Pages workflow uploads it as the artifact.
- `.gitignore` ignores `.*`, so `site/.nojekyll` and `.github/workflows/deploy-pages.yml` remain force-added when first touched.
- Tests use the Node built-in runner via `node --test tests/*.test.js`.

## Approaches

1. Workflow-only sync: simplest guarantee for published output, but no convenient local regeneration command.
2. Local script only: convenient, but a forgotten command can still ship a stale mirror.
3. Both: local command for developers plus workflow sync as the final authority. This is the chosen approach because it removes the manual copy step while preserving a committed mirror and local drift checking.

## Design

Add `scripts/sync-site.js`. It creates `site/` if missing, ensures an empty `site/.nojekyll`, and byte-for-byte copies the three root app files into `site/` with `fs.copyFileSync`. It is idempotent and uses paths relative to the script location.

Update `.github/workflows/deploy-pages.yml` to run `node scripts/sync-site.js` after checkout/setup and before `node --test tests/*.test.js`, `configure-pages`, artifact upload, and deployment. This means committed `site/` may become stale locally, but the published artifact cannot drift from root sources.

Keep `tests/site.test.js` as the local drift guard. Add `tests/sync-site.test.js` to prove the script repairs drifted files and restores `.nojekyll`. Update `tests/pages_workflow.test.js` to require the sync step before the test step.

Update README hosted-copy instructions from “copy those three files into `site/`” to “run `node scripts/sync-site.js` locally, then push; the workflow also syncs before deployment.”

## Builder calls

- No `package.json` will be added; adding an npm script would be extra machinery for one command.
- The workflow will sync before tests so deployment cannot fail because someone forgot the local script.
- The local script will create `.nojekyll` if absent so regeneration is complete on a fresh checkout.
