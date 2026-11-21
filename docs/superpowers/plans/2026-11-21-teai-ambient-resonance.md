# teai Ambient Resonance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-click-launchable `teai` browser app that renders an ambient resonance field reacting to voice/typing, whisper nudges, and blooming idea nodes.

**Architecture:** A Pinokio serverless web app: static `index.html` handles layout, styling, canvas rendering, and browser input; `resonance.js` holds pure signal-fusion and node-graph functions so they can be tested with Node's built-in test runner. No server, build step, dependencies, or network calls.

**Tech Stack:** HTML5 Canvas 2D, Web Audio API (mic RMS + spectral centroid), keyboard/pointer events, `localStorage`, Node 24 `node:test` for tests only.

**Spec:** `docs/superpowers/specs/2026-11-21-teai-ambient-resonance-design.md`

## Global Constraints

- Destination root: `C:\pinokio\api\teai` (resolved from `~/.pinokio/config.json` → `home` = `C:\pinokio`).
- Mirror `C:\pinokio\prototype\system\examples\serverless_web_app`: `index.html` + `pinokio.json` at root, no `install.js`/`start.js`, no `version` field in `pinokio.json`.
- No external URLs, CDNs, API keys, npm packages, or backend services at runtime.
- No git commits unless the user explicitly asks (repo currently has no commits).
- Use relative paths in all Pinokio-facing configuration; keep app logic out of launcher metadata.
- Tests run with `node --test tests/*.test.js` from the launcher root; no test framework install.

## Review Focus

- **Microphone denied or absent:** typing/pointer signals still drive the field; covered in Task 1 `test_update_score_without_microphone`.
- **Long idle:** score decays toward calm instead of freezing at high activation; covered in Task 1 `test_update_score_decays_when_idle`.
- **Bursty input:** score rises toward activation but is eased, never jumps discontinuously; covered in Task 1 `test_update_score_is_eased_and_clamped`.
- **Nudge spam:** repeated high activation cannot fire nudges more than once per cooldown; covered in Task 1 `test_should_nudge_respects_cooldown`.
- **Node graph growth:** links stay bounded and node coordinates stay on-canvas for many nodes; covered in Task 1 `test_link_nodes_bounds_and_make_node_coordinates`.

---

### Task 1: Resonance signal core

**Files:**
- Create: `resonance.js`
- Create: `tests/resonance.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: global `window.TeaiResonance` and CommonJS `module.exports` with:
  - `updateScore({ micLevel, spectralCentroid, typingRate, idleMs, previousScore, dtMs }) -> number` (0..1)
  - `shouldNudge({ score, highSinceMs, lastNudgeAtMs, nowMs }) -> boolean`
  - `makeNode({ text, score, nowMs, sequence }) -> { id, text, score, createdAt, x, y }`
  - `linkNodes(nodes) -> [{ from, to }]`

- [ ] **Step 1: Write the failing tests**

Create `tests/resonance.test.js` using `node:test` and `node:assert/strict`, requiring `../resonance.js`, with these exact cases:

```js
test('test_update_score_without_microphone', () => {
  const score = TeaiResonance.updateScore({
    micLevel: null, spectralCentroid: null, typingRate: 5,
    idleMs: 0, previousScore: 0, dtMs: 600
  })
  assert.ok(score > 0 && score <= 1)
})

test('test_update_score_decays_when_idle', () => {
  const active = TeaiResonance.updateScore({
    micLevel: 1, spectralCentroid: 1, typingRate: 6,
    idleMs: 0, previousScore: 0, dtMs: 600
  })
  const idle = TeaiResonance.updateScore({
    micLevel: 0, spectralCentroid: 0, typingRate: 0,
    idleMs: 30000, previousScore: active, dtMs: 600
  })
  assert.ok(idle < active * 0.5)
})

test('test_update_score_is_eased_and_clamped', () => {
  const first = TeaiResonance.updateScore({
    micLevel: 1, spectralCentroid: 1, typingRate: 10,
    idleMs: 0, previousScore: 0, dtMs: 16
  })
  const later = TeaiResonance.updateScore({
    micLevel: 1, spectralCentroid: 1, typingRate: 10,
    idleMs: 0, previousScore: first, dtMs: 600
  })
  assert.ok(first > 0 && first < 0.1)
  assert.ok(later > first && later <= 1)
})

test('test_should_nudge_respects_cooldown', () => {
  const args = { score: 0.9, highSinceMs: 1000, nowMs: 6000, lastNudgeAtMs: -100000 }
  assert.equal(TeaiResonance.shouldNudge(args), true)
  assert.equal(TeaiResonance.shouldNudge({ ...args, lastNudgeAtMs: 5000 }), false)
  assert.equal(TeaiResonance.shouldNudge({ ...args, highSinceMs: 5000 }), false)
  assert.equal(TeaiResonance.shouldNudge({ ...args, score: 0.5 }), false)
})

test('test_link_nodes_bounds_and_make_node_coordinates', () => {
  const nodes = [0, 1, 2, 3, 4].map(sequence => TeaiResonance.makeNode({
    text: `idea ${sequence}`, score: 0.5, nowMs: sequence * 1000, sequence
  }))
  for (const node of nodes) {
    assert.ok(node.x >= 0 && node.x <= 1)
    assert.ok(node.y >= 0 && node.y <= 1)
  }
  const links = TeaiResonance.linkNodes(nodes)
  assert.ok(links.length > 0)
  assert.ok(links.length <= nodes.length * 2)
  assert.ok(links.every(link => link.from !== link.to))
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/resonance.test.js`
Expected: FAIL — `Cannot find module '../resonance.js'`.

- [ ] **Step 3: Implement `resonance.js`**

Implement the four exported functions. Pin these exact values:
- `updateScore`: target = `clamp(0.45*micLevel + 0.20*spectralCentroid + 0.35*min(typingRate/6, 1))`; treat null mic/centroid as 0; when `idleMs > 8000`, multiply target by `Math.exp(-(idleMs - 8000)/12000)`; ease with `previous + (target - previous) * min(dtMs/600, 1)`; clamp to 0..1.
- `shouldNudge`: true only when `score >= 0.72`, `nowMs - highSinceMs >= 4000`, and `nowMs - lastNudgeAtMs >= 20000`.
- `makeNode`: `id = idea-${sequence}`, `createdAt = nowMs`, `x = 0.5 + 0.32*Math.sin(sequence*2.399)`, `y = 0.5 + 0.26*Math.cos(sequence*1.618)`.
- `linkNodes`: link pairs whose `createdAt` differs by at most 10000 ms and `score` differs by at most 0.35; skip self-links; cap at 2 links per node.

Export via `module.exports = TeaiResonance` when `module` exists, and assign `window.TeaiResonance` when `window` exists.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/resonance.test.js`
Expected: PASS — 5 tests.

---

### Task 2: Ambient browser interface

**Files:**
- Create: `index.html`
- Create: `tests/interface.test.js`

**Interfaces:**
- Consumes: `TeaiResonance.updateScore`, `shouldNudge`, `makeNode`, `linkNodes` from Task 1.
- Produces: a browser page at the Pinokio app root; no JS API consumed by other tasks.

- [ ] **Step 1: Write the failing interface tests**

Create `tests/interface.test.js` reading `index.html` with `node:fs` and asserting: it contains `<canvas`, `resonance.js`, `getUserMedia`, `keydown`, `localStorage`, and does not contain `http://` or `https://`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/interface.test.js`
Expected: FAIL — ENOENT for `index.html`.

- [ ] **Step 3: Implement `index.html`**

Build a single dark, calm page:
- Full-viewport `<canvas id="field">` with layered concentric ripples/particles; hue drifts from deep blue (calm) to warm amber (activated), amplitude/speed scale with score from `updateScore`.
- A top-right status whisper line showing one short phrase when `shouldNudge` fires; fades after 4 seconds; no pop-ups or wordy notifications.
- A minimal bottom-center phrase input (single line, borderless) labeled only by placeholder; pressing Enter calls `makeNode` and renders a blooming node with links from `linkNodes`.
- Mic permission button labeled "listen" using `getUserMedia` + `AnalyserNode`; when denied/unavailable, hide the button and continue with typing/pointer signals only (`micLevel: null`).
- Pointer movement and `keydown` update typingRate/idleMs; animation loop uses `requestAnimationFrame` and `dtMs`.
- Keep node state in memory and save/restore the phrase list with `localStorage` under key `teai.nodes`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/interface.test.js`
Expected: PASS — 1 test.

---

### Task 3: Metadata, docs, and launch verification

**Files:**
- Create: `pinokio.json`
- Create: `README.md`

**Interfaces:**
- Consumes: `index.html` from Task 2.
- Produces: Pinokio-discoverable app metadata and user documentation.

- [ ] **Step 1: Write metadata and docs**

`pinokio.json` must mirror the serverless example shape with `"title": "teai"`, a description of the ambient resonance experience, `"icon": "icon.png"` omitted (no icon asset exists), and `"plugin": { "menu": [] }`. Do not add a `version` field.

`README.md` must contain: what the app does, how to launch it in Pinokio, how to use mic/typing/nodes/nudges, an explicit note that the app simulates attunement and does not read minds, and a short "API" section stating there is no HTTP API in this version with equivalent JavaScript (call `TeaiResonance.*` from devtools), Python (read `index.html`/`resonance.js` as static files), and curl (serve the folder with any static file server) examples.

- [ ] **Step 2: Run all tests**

Run: `node --test tests/*.test.js`
Expected: PASS — 6 tests.

- [ ] **Step 3: Verify Pinokio status and launch**

Run: `pterm.cmd status "pinokio://192.168.100.10:42000/api/teai"`, then `pterm.cmd run <ref>` if state is `offline`, polling `pterm.cmd status <ref>` until `state=online`/`ready=true` (180s timeout). If the serverless app has no runnable script, use `pterm.cmd open` on the app URL reported by Pinokio instead of inventing a local port.

- [ ] **Step 4: Confirm the exit checklist**

Re-open `AGENTS.md`, confirm destination root is `C:\pinokio\api\teai`, the serverless example was mirrored, no launcher scripts were added, no commits were made, and all tests pass.
