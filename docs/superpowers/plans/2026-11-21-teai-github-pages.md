# GitHub Pages Hosted Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a standalone static copy of `teai` on GitHub Pages so an Android phone can open it anywhere over HTTPS.

**Architecture:** Keep the root app files as the source of truth, mirror the three static files into a committed `site/` folder, and deploy that folder with a GitHub Actions Pages workflow. A sync test prevents the mirror from drifting.

**Tech Stack:** Vanilla browser JavaScript, static HTML/CSS, Node built-in test runner, GitHub CLI, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-21-teai-github-pages-design.md`

## Global Constraints
- GitHub account is `FrancisBA`, authenticated via `gh`.
- No existing `teai` repo; existing repos are private.
- GitHub Pages on a free account requires a public repository.
- Current app files are `index.html`, `resonance.js`, and `recording.js`; all resources are relative.
- Existing tests use `node --test tests/*.test.js`.
- Do not add secrets or tokens to the repository.
- `.gitignore` ignores `.*`; force-add `site/.nojekyll` and `.github/workflows/deploy-pages.yml`.
- No custom domain.
- Notes and recordings stay in per-device browser storage; no syncing.

## Review Focus
- Mirror drift — `site/` files must stay byte-for-byte identical to root sources; pinned by Task 1 sync test.
- Hosted copy self-containment — no external URLs or Pinokio launcher references; pinned by Task 1 site test.
- Pages workflow correctness — correct trigger, permissions, `site/` path, and deploy action; pinned by Task 2 workflow test.
- Live deployment — Pages URL returns the app, not a 404; pinned by Task 3 HTTP check.
- HTTPS/microphone — hosted URL must be `https://` because Android blocks microphone access on plain HTTP; pinned by Task 3 URL check.

---

### Task 1: Static site mirror

**Files:**
- Create: `site/index.html`
- Create: `site/resonance.js`
- Create: `site/recording.js`
- Create: `site/.nojekyll`
- Test: `tests/site.test.js`

**Interfaces:**
- Consumes: root `index.html`, root `resonance.js`, root `recording.js`.
- Produces: `site/` deployable static folder; `tests/site.test.js` sync guard.

- [ ] **Step 1: Write the failing tests**

Add `tests/site.test.js`:

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const site = path.join(root, 'site')

const pairs = ['index.html', 'resonance.js', 'recording.js']

test('site mirrors the static app sources', () => {
  for (const name of pairs) {
    assert.equal(
      fs.readFileSync(path.join(site, name), 'utf8'),
      fs.readFileSync(path.join(root, name), 'utf8'),
      `${name} is out of sync`
    )
  }
})

test('hosted copy is self-contained', () => {
  const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8')
  for (const fragment of ['<canvas', 'resonance.js', 'recording.js']) {
    assert.ok(html.includes(fragment), `missing ${fragment}`)
  }
  assert.ok(!html.includes('http://'), 'unexpected external http URL')
  assert.ok(!html.includes('https://'), 'unexpected external https URL')
  assert.ok(!html.includes('pinokio.js'), 'unexpected Pinokio launcher reference')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/site.test.js`
Expected: FAIL because `site/` does not exist.

- [ ] **Step 3: Create the static mirror**

Copy root `index.html`, `resonance.js`, and `recording.js` into `site/` byte-for-byte. Create empty `site/.nojekyll`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/site.test.js`
Expected: PASS — 2 tests.

- [ ] **Step 5: Run the full suite**

Run: `node --test tests/*.test.js`
Expected: PASS — 27 tests.

- [ ] **Step 6: Commit**

```bash
git add -f site/.nojekyll
git add site/index.html site/resonance.js site/recording.js tests/site.test.js docs/superpowers/specs/2026-11-21-teai-github-pages-design.md docs/superpowers/plans/2026-11-21-teai-github-pages.md
git commit -m "feat: add static site mirror for hosting"
```

---

### Task 2: GitHub Pages workflow

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Test: `tests/pages_workflow.test.js`

**Interfaces:**
- Consumes: `site/` folder from Task 1.
- Produces: automated GitHub Pages deployment on every push to `main`.

- [ ] **Step 1: Write the failing test**

Add `tests/pages_workflow.test.js`:

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/pages_workflow.test.js`
Expected: FAIL because the workflow file does not exist.

- [ ] **Step 3: Create the Pages workflow**

Create `.github/workflows/deploy-pages.yml` with:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: node --test tests/*.test.js
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/pages_workflow.test.js`
Expected: PASS — 1 test.

- [ ] **Step 5: Run the full suite**

Run: `node --test tests/*.test.js`
Expected: PASS — 28 tests.

- [ ] **Step 6: Commit**

```bash
git add -f .github/workflows/deploy-pages.yml
git add tests/pages_workflow.test.js
git commit -m "ci: deploy static site to GitHub Pages"
```

---

### Task 3: Publish repository and document hosted URL

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `site/` from Task 1 and `.github/workflows/deploy-pages.yml` from Task 2.
- Produces: public GitHub repo, live Pages URL, README instructions.

- [ ] **Step 1: Verify local readiness**

Run: `node --test tests/*.test.js`
Expected: PASS — 28 tests.

- [ ] **Step 2: Create and push the public repository**

Run: `gh repo create FrancisBA/teai --public --source=. --remote=origin --push`
Expected: repo created, `origin` set, current `main` pushed.

If GitHub reports the repo already exists, stop and ask the human partner before continuing.

- [ ] **Step 3: Enable Pages workflow deployment**

Run: `gh api -X POST repos/FrancisBA/teai/pages -f build_type=workflow
`
Expected: Pages configured with build type `workflow`.

- [ ] **Step 4: Wait for the first deployment**

Run:

```bash
gh run list --repo FrancisBA/teai --workflow deploy-pages.yml --limit 1
gh run watch --repo FrancisBA/teai $(gh run list --repo FrancisBA/teai --workflow deploy-pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected: run completes with `success`.

- [ ] **Step 5: Resolve and verify the live URL**

Run:

```bash
$pagesUrl = gh api repos/FrancisBA/teai/pages --jq .html_url
curl.exe -s -o NUL -w "%{http_code}" "$pagesUrl"
python "C:\pinokio\cache\TEMP\opencode\teai_check_url.py" "$pagesUrl"
```

Expected: URL starts with `https://`, HTTP status `200`, browser check reports `title=teai`, canvas dimensions, `resonance=object`, `recording=object`, and zero errors.

- [ ] **Step 6: Document the hosted copy**

Add a `## Hosted copy` section to `README.md` with:
- the confirmed Pages URL from Step 5
- note that it is HTTPS and works from any phone/browser
- note that notes and recordings are stored only in that browser/device
- update instructions: edit root app files, copy the three static files into `site/`, push to `main`, workflow deploys automatically

- [ ] **Step 7: Run full suite and commit docs**

Run: `node --test tests/*.test.js`
Expected: PASS — 28 tests.

Commit:

```bash
git add README.md
git commit -m "docs: add hosted copy instructions"
git push origin main
```

- [ ] **Step 8: Confirm final deployment**

Re-run the URL verification from Step 5 after the README push.
Expected: final live page still returns `200` with zero browser errors.
