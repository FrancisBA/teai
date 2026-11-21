# Site Sync Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local command and workflow step that regenerate the hosted `site/` mirror from root app sources, so updates cannot drift.

**Architecture:** Keep root `index.html`, `resonance.js`, and `recording.js` as the source of truth. A small Node script copies them into `site/` and ensures `.nojekyll`. Developers can run it locally; the Pages workflow runs it before tests and upload as the final authority.

**Tech Stack:** Vanilla Node.js built-ins, GitHub Actions, GitHub Pages, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-21-site-sync-automation-design.md`

## Global Constraints

- Existing repo has no `package.json`; the local command is `node scripts/sync-site.js`.
- Root source files are `index.html`, `resonance.js`, and `recording.js`.
- `site/` remains committed; the workflow uploads it as the Pages artifact.
- `.gitignore` ignores `.*`; force-add `site/.nojekyll` and `.github/workflows/deploy-pages.yml` when first touched.
- Tests use `node --test tests/*.test.js`.
- No custom domain, backend, accounts, analytics, secrets, or cross-device storage sync.
- No change to app runtime behavior.

## Review Focus

- Fresh checkout with missing `site/.nojekyll` — sync script must create it; pinned by Task 1.
- Stale mirrored files after a root edit — sync script must overwrite them byte-for-byte; pinned by Task 1.
- Workflow omits or reorders sync — deployment must sync before tests and upload; pinned by Task 2.
- Developer follows README — update instructions must name the local command and workflow behavior; pinned by Task 2.
- Hosted app still works after rollout — live URL must return 200 with zero browser errors; pinned by Task 3.

---

### Task 1: Local sync script

**Files:**
- Create: `scripts/sync-site.js`
- Create: `tests/sync-site.test.js`
- Commit: `docs/superpowers/specs/2026-11-21-site-sync-automation-design.md`, `docs/superpowers/plans/2026-11-21-site-sync-automation.md`

**Interfaces:**
- Consumes: root `index.html`, `resonance.js`, `recording.js`.
- Produces: `syncSite(options)` where `options` is optional; supported keys are `rootDir` and `siteDir`. Defaults are `rootDir = path.resolve(__dirname, '..')` and `siteDir = path.join(rootDir, 'site')`. Running the file with Node calls `syncSite()` with defaults. Export `syncSite` from the module.

- [ ] **Step 1: Write the failing test**

Add `tests/sync-site.test.js`:

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { syncSite } = require('../scripts/sync-site.js')

const names = ['index.html', 'resonance.js', 'recording.js']

function makeFixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teai-sync-'))
  const siteDir = path.join(rootDir, 'site')
  fs.mkdirSync(siteDir)
  for (const name of names) {
    fs.writeFileSync(path.join(rootDir, name), `source ${name}\n`)
    fs.writeFileSync(path.join(siteDir, name), `stale ${name}\n`)
  }
  return { rootDir, siteDir }
}

test('syncSite repairs stale files and restores .nojekyll', t => {
  const { rootDir, siteDir } = makeFixture()
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }))

  syncSite({ rootDir, siteDir })

  for (const name of names) {
    assert.equal(
      fs.readFileSync(path.join(siteDir, name), 'utf8'),
      fs.readFileSync(path.join(rootDir, name), 'utf8'),
      `${name} was not synced`
    )
  }
  assert.equal(fs.readFileSync(path.join(siteDir, '.nojekyll'), 'utf8'), '')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sync-site.test.js`
Expected: FAIL because `scripts/sync-site.js` does not exist.

- [ ] **Step 3: Implement the sync script**

Create `scripts/sync-site.js`. Use only `node:fs` and `node:path`. Export `syncSite` with the exact interface from this task. The function must:
  - create `siteDir` recursively if missing;
  - create empty `.nojekyll` in `siteDir` only if absent;
  - copy the three root files into `siteDir` byte-for-byte with `fs.copyFileSync`;
  - call `syncSite()` with defaults only when run as the main module.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/sync-site.test.js`
Expected: PASS — 1 test.

- [ ] **Step 5: Run the full suite**

Run: `node --test tests/*.test.js`
Expected: PASS — 29 tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-site.js tests/sync-site.test.js docs/superpowers/specs/2026-11-21-site-sync-automation-design.md docs/superpowers/plans/2026-11-21-site-sync-automation.md
git commit -m "feat: add local site sync script"
```

---

### Task 2: Workflow auto-sync and documentation

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `tests/pages_workflow.test.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: `node scripts/sync-site.js` from Task 1.
- Produces: workflow that regenerates `site/` before tests and upload, plus README update instructions.

- [ ] **Step 1: Write the failing test**

Replace `tests/pages_workflow.test.js` with:

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const workflow = fs.readFileSync(
  path.join(__dirname, '..', '.github', 'workflows', 'deploy-pages.yml'),
  'utf8'
)

test('pages workflow deploys the static site on main', () => {
  assert.match(workflow, /branches:\s*\[\s*main\s*\]/)
  assert.match(workflow, /node --test tests\/\*\.test\.js/)
  assert.match(workflow, /path:\s*site/)
  assert.match(workflow, /actions\/upload-pages-artifact@v\d+/)
  assert.match(workflow, /actions\/deploy-pages@v\d+/)
  assert.match(workflow, /pages:\s*write/)
  assert.match(workflow, /id-token:\s*write/)
})

test('pages workflow syncs site before tests and upload', () => {
  const syncIndex = workflow.indexOf('node scripts/sync-site.js')
  const testIndex = workflow.indexOf('node --test tests/*.test.js')
  const uploadIndex = workflow.indexOf('actions/upload-pages-artifact')

  assert.ok(syncIndex >= 0, 'missing sync step')
  assert.ok(testIndex >= 0, 'missing test step')
  assert.ok(uploadIndex >= 0, 'missing upload step')
  assert.ok(syncIndex < testIndex, 'sync must run before tests')
  assert.ok(syncIndex < uploadIndex, 'sync must run before upload')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/pages_workflow.test.js`
Expected: FAIL with `missing sync step`.

- [ ] **Step 3: Add the workflow sync step**

In `.github/workflows/deploy-pages.yml`, add exactly this step after the `actions/setup-node@v4` step and before the test step:

```yaml
      - run: node scripts/sync-site.js
```

- [ ] **Step 4: Update README instructions**

In `README.md`, replace the update sentence in `## Hosted copy` so it says:

```text
To update the hosted copy: edit the root `index.html`, `resonance.js`, and `recording.js`, run `node scripts/sync-site.js` locally to refresh `site/`, then push to `main`. The GitHub Pages workflow also runs the sync before tests and deployment.
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/pages_workflow.test.js`
Expected: PASS — 2 tests.

- [ ] **Step 6: Run the full suite**

Run: `node --test tests/*.test.js`
Expected: PASS — 30 tests.

- [ ] **Step 7: Commit**

```bash
git add -f .github/workflows/deploy-pages.yml
git add tests/pages_workflow.test.js README.md
git commit -m "ci: sync hosted site from root sources"
```

---

### Task 3: Publish and verify

**Files:**
- Modify: none

**Interfaces:**
- Consumes: workflow from Task 2 and local sync script from Task 1.
- Produces: verified live Pages deployment after pushing the new commits.

- [ ] **Step 1: Verify local readiness**

Run: `node --test tests/*.test.js`
Expected: PASS — 30 tests.

- [ ] **Step 2: Push the commits**

Run: `git push origin main`
Expected: commits pushed to `FrancisBA/teai`.

- [ ] **Step 3: Wait for deployment**

Run:

```bash
gh run list --repo FrancisBA/teai --workflow deploy-pages.yml --limit 1
gh run watch --repo FrancisBA/teai $(gh run list --repo FrancisBA/teai --workflow deploy-pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected: latest run completes with `success`.

- [ ] **Step 4: Verify the live site**

Run:

```bash
$pagesUrl = gh api repos/FrancisBA/teai/pages --jq .html_url
curl.exe -s -o NUL -w "%{http_code}" "$pagesUrl"
python "C:\pinokio\cache\TEMP\opencode\teai_check_url.py" "$pagesUrl"
```

Expected: URL is `https://francisba.github.io/teai/`, HTTP status `200`, browser check reports `title=teai`, canvas dimensions, `resonance=object`, `recording=object`, and `EVENT_COUNT 0`.

- [ ] **Step 5: Hand off the Android checklist**

Tell the human partner to open the hosted URL on the Android phone, allow microphone access, record and save a named clip, reload the page, and confirm the clip still plays. This is a manual device check; do not claim it was executed by the agent.
