# teai — GitHub Pages hosted copy design

Date: 2026-11-21
Size: small change

## Intent
Publish a standalone copy of `teai` on GitHub Pages so it opens on an Android phone from anywhere. HTTPS from Pages also allows microphone recording, which plain LAN HTTP cannot provide.

## Goals
- Create a public `FrancisBA/teai` GitHub repository with the current working tree as its source.
- Keep the hosted copy purely static: `HTML + CSS + JavaScript`, no backend and no runtime dependencies.
- Deploy automatically from `main` with GitHub Actions.
- Keep a committed `site/` folder that can also be uploaded to another static host.
- Ensure `site/` stays byte-for-byte in sync with the root app files.
- Document how to update and use the hosted copy.

## Non-goals
- No Pinokio launcher changes beyond what is already committed.
- No server, API, database, accounts, analytics, or external assets.
- No syncing of notes or recordings between devices; browser storage stays per-device.
- No custom domain.

## Constraints
- GitHub account is `FrancisBA`, authenticated via `gh`.
- No existing `teai` repo; existing repos are private.
- GitHub Pages on a free account requires a public repository.
- Current app files are `index.html`, `resonance.js`, and `recording.js`; all resources are relative.
- Existing tests use `node --test tests/*.test.js`.
- Do not add secrets or tokens to the repository.

## Approaches
1. **A — Committed `site/` + Actions deploy (chosen).** Keep exact static copies in `site/`, add a Pages workflow, and add a sync test. The folder is deployable anywhere and Actions makes GitHub Publishing repeatable. Cost: three duplicated files guarded by a test.
2. **B — Pages from `/docs`.** Put the static files under `docs/` and enable Pages from that folder. Fewer workflow files, but mixes deployable assets with design docs and is less portable.
3. **C — `gh-pages` branch.** Keep only built files on a separate branch. Simple hosting, but source and deployed files can drift and the workflow is less transparent.

## Design
- Create public repo `FrancisBA/teai` from the current `main` branch.
- Add `site/index.html`, `site/resonance.js`, and `site/recording.js` as exact copies of the root files.
- Add `site/.nojekyll` so GitHub Pages serves the files unchanged.
- Add `.github/workflows/deploy-pages.yml`:
  - trigger on pushes to `main` and manual dispatch
  - run `node --test tests/*.test.js`
  - upload `site/` with `actions/upload-pages-artifact`
  - deploy with `actions/deploy-pages`
- Add `tests/site.test.js` to assert byte-for-byte equality between root and `site/` copies and to assert `site/index.html` remains self-contained.
- Update `README.md` with the hosted URL once confirmed and short update instructions.
- Keep all browser storage behavior unchanged.

## Files
- `site/index.html`
- `site/resonance.js`
- `site/recording.js`
- `site/.nojekyll`
- `.github/workflows/deploy-pages.yml`
- `tests/site.test.js`
- `README.md`
