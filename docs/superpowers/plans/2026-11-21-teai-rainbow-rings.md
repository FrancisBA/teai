# Rainbow Rings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each expanding ring's stroked line change from brown near the center to purple at the outer edge, passing through the rainbow in between.

**Architecture:** Add a pure radius-to-color helper beside the existing resonance helpers, then use it per frame in the ring loop. Energy continues to drive alpha, line width, and speed; hue no longer depends on the resonance score.

**Tech Stack:** Vanilla browser JavaScript, Canvas 2D, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-21-teai-rainbow-rings-design.md`

## Global Constraints
- Destination: `C:\pinokio\api\teai`.
- Static serverless app; `index.html` remains the entry point.
- No dependencies, build step, assets, launcher scripts, or server code.
- Do not commit unless explicitly asked.
- Existing glow, particles, nodes, nudges, and recording UI remain unchanged.

## Review Focus
- Brown inner anchor — pinned by `test_ring_color_inner_is_brown`.
- Purple outer anchor with enough alpha to be seen — pinned by `test_ring_color_outer_is_purple` and the outer-alpha assertion in Task 2.
- Out-of-range radius ratios — pinned by `test_ring_color_clamps_out_of_range`.
- Energy must not reorder the spectrum — pinned by the stroke assertion in Task 2 that the loop uses `R.ringColor(radius / maxRadius)` instead of `hue + i`.
- Nudge softening must still apply — pinned by the `soften` assertion in Task 2.

---

### Task 1: Radius-to-color helper

**Files:**
- Modify: `resonance.js`
- Test: `tests/resonance.test.js`

**Interfaces:**
- Consumes: existing `clamp` helper in `resonance.js`.
- Produces: `ringColor(radiusRatio) -> { hue: number, saturation: number, lightness: number }`, exported via `module.exports` and `window.TeaiResonance`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/resonance.test.js`:

```js
test('test_ring_color_inner_is_brown', () => {
  assert.deepEqual(R.ringColor(0), { hue: 24, saturation: 78, lightness: 30 })
})

test('test_ring_color_midpoint_is_green', () => {
  assert.deepEqual(R.ringColor(0.5), { hue: 152, saturation: 78, lightness: 49 })
})

test('test_ring_color_outer_is_purple', () => {
  assert.deepEqual(R.ringColor(1), { hue: 280, saturation: 78, lightness: 68 })
})

test('test_ring_color_clamps_out_of_range', () => {
  assert.deepEqual(R.ringColor(-3), R.ringColor(0))
  assert.deepEqual(R.ringColor(4), R.ringColor(1))
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/resonance.test.js`
Expected: FAIL — `R.ringColor is not a function`.

- [ ] **Step 3: Implement `ringColor(radiusRatio)` in `resonance.js`**

Rules: clamp the input to `0..1`; return `hue: 24 + t * 256`, `saturation: 78`, `lightness: 30 + t * 38`. Add `ringColor` to the returned object in both exports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/resonance.test.js`
Expected: PASS — 11 tests.

---

### Task 2: Wire the helper into the ring loop

**Files:**
- Modify: `index.html`
- Test: `tests/interface.test.js`

**Interfaces:**
- Consumes: `TeaiResonance.ringColor(radiusRatio)` from Task 1.
- Produces: radius-keyed ring strokes in the Canvas field.

- [ ] **Step 1: Write the failing UI test**

Add to `tests/interface.test.js`:

```js
test('ring strokes use the radius-keyed rainbow helper', () => {
  assert.match(html, /const ring = R\.ringColor\(t\)/)
  assert.match(html, /ring\.hue/)
  assert.match(html, /ring\.saturation/)
  assert.match(html, /ring\.lightness/)
  assert.ok(!html.includes('hue + i * 4'), 'old score-driven ring hue still present')
})

test('outer rings stay visible and nudges still soften', () => {
  assert.match(html, /0\.25 \+ 0\.75 \* \(1 - t\)/)
  assert.match(html, /\* soften/)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/interface.test.js`
Expected: FAIL — missing `ring` assertions.

- [ ] **Step 3: Update the ring loop in `index.html`**

In the seven-ring loop, set `const t = radius / maxRadius`, get `const ring = R.ringColor(t)`, and stroke with `ring.hue`, `ring.saturation`, and `ring.lightness`. Replace the existing alpha expression with `(0.25 + 0.75 * (1 - t)) * (.04 + state.score * .1) * soften`. Keep line width and all other drawing code unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/*.test.js`
Expected: PASS — 25 tests.

- [ ] **Step 5: Verify the app still serves and executes**

Run:

```bash
curl.exe -s -o NUL -w "%{http_code}" "http://127.0.0.1:42000/asset/api/teai/index.html"
python "C:\pinokio\cache\TEMP\opencode\teai_check_url.py" "http://127.0.0.1:42000/asset/api/teai/index.html"
```

Expected: `200`; browser check reports `canvas` dimensions, `resonance=object`, and zero console/page errors.
