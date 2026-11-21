# teai Named Audio Recordings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit audio recording, typed naming, and a local review library to the existing `teai` browser app.

**Architecture:** Pure recording helpers live in `recording.js` for Node tests; `index.html` owns `MediaRecorder`, IndexedDB persistence, and the review UI. No server, dependencies, or upload path. Existing resonance behavior stays intact.

**Tech Stack:** MediaRecorder, getUserMedia, IndexedDB, object URLs, Node 24 `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-21-teai-audio-recording-design.md`

## Global Constraints

- Destination root: `C:\pinokio\api\teai`; `index.html` remains the serverless entry point and `pinokio.js` keeps its default menu item.
- No new launcher scripts, npm packages, network calls, or external URLs in `index.html`.
- Never record without an explicit record click; audio never leaves the browser.
- Names are required, trimmed, max 80 characters; `createdAt` uses `Date.now()`.
- IndexedDB database `teai`, store `recordings`, key path `id`.
- Tests: `node --test tests/*.test.js` from the launcher root.
- Commit only after all tests pass and the app URL returns HTTP 200.

## Review Focus

- **Mic denied:** record is unavailable with an inline explanation; covered in Task 2 by the static UI test requiring a denial message element and in Task 1 by `test_choose_mime_type_falls_back`.
- **Empty or oversized name:** save is blocked; covered in Task 1 `test_validate_name_rejects_empty_and_long_values`.
- **Stop before record:** no clip is created; covered in Task 2 UI logic and `test_make_record_requires_blob`.
- **Storage failure:** existing clips survive and an inline error appears; covered in Task 2 by error-handling UI assertions.
- **Long library:** newest-first ordering and stable duration display; covered in Task 1 `test_sort_records_newest_first` and `test_format_duration`.

---

### Task 1: Recording helpers

**Files:**
- Create: `recording.js`
- Create: `tests/recording.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: global `window.Recording` and CommonJS `module.exports` with:
  - `validateName(value) -> string | null`
  - `chooseMimeType(types, isSupported) -> string`
  - `makeRecord({ id, name, createdAt, durationMs, blob, mimeType }) -> object | null`
  - `formatDuration(ms) -> string`
  - `sortRecords(records) -> array`

- [ ] **Step 1: Write the failing tests**

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const Recording = require('../recording.js')

test('test_validate_name_rejects_empty_and_long_values', () => {
  assert.equal(Recording.validateName('   '), null)
  assert.equal(Recording.validateName('x'.repeat(81)), null)
  assert.equal(Recording.validateName('  morning calm  '), 'morning calm')
})

test('test_choose_mime_type_falls_back', () => {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  assert.equal(Recording.chooseMimeType(types, type => type === 'audio/webm'), 'audio/webm')
  assert.equal(Recording.chooseMimeType(types, () => false), '')
})

test('test_make_record_requires_blob', () => {
  const base = { id: 'r1', name: 'calm', createdAt: 1000, durationMs: 12000, mimeType: 'audio/webm' }
  assert.equal(Recording.makeRecord({ ...base, blob: null }), null)
  const record = Recording.makeRecord({ ...base, blob: { size: 42 } })
  assert.equal(record.id, 'r1')
  assert.equal(record.durationMs, 12000)
})

test('test_format_duration', () => {
  assert.equal(Recording.formatDuration(0), '0:00')
  assert.equal(Recording.formatDuration(12000), '0:12')
  assert.equal(Recording.formatDuration(65000), '1:05')
})

test('test_sort_records_newest_first', () => {
  const records = [
    { id: 'a', createdAt: 100 },
    { id: 'b', createdAt: 300 },
    { id: 'c', createdAt: 200 }
  ]
  assert.deepEqual(Recording.sortRecords(records).map(r => r.id), ['b', 'c', 'a'])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/recording.test.js`
Expected: FAIL — `Cannot find module '../recording.js'`.

- [ ] **Step 3: Implement `recording.js`**

Implement the five exported functions with these exact rules: `validateName` trims, returns null for empty or length > 80. `chooseMimeType` returns the first type where `isSupported(type)` is true, otherwise `''`. `makeRecord` returns null unless `blob` is truthy and `name` is a non-empty string; otherwise returns a fresh object with the given fields. `formatDuration` uses `Math.floor(ms/1000)` as `m:ss` with a zero-padded seconds part. `sortRecords` returns a new array sorted by `createdAt` descending. Export as both `window.Recording` and CommonJS `module.exports`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/recording.test.js`
Expected: PASS — 5 tests.

---

### Task 2: Recording controls and review library

**Files:**
- Create: `tests/recording_ui.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `Recording.validateName`, `chooseMimeType`, `makeRecord`, `formatDuration`, `sortRecords` from Task 1.
- Produces: in-app recording UI; no JS API consumed elsewhere.

- [ ] **Step 1: Write the failing UI tests**

Create `tests/recording_ui.test.js` reading `index.html` and asserting it contains `MediaRecorder`, `indexedDB`, `record`, `stop`, `library`, `download`, and `Microphone access is required`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/recording_ui.test.js`
Expected: FAIL — missing strings.

- [ ] **Step 3: Implement the UI**

Add to `index.html`:
- Controls: `record`, `stop`, and an inline mic-denied message element (`Microphone access is required to record`).
- Naming panel: name input, `save`, `discard`; hidden until a recording stops; save disabled for invalid names via `Recording.validateName`.
- Library section listing saved clips with name, `formatDuration(createdAt..durationMs)`, date, play/pause, rename, download, delete.
- Shared mic stream: store the stream from `listen` in state and reuse it for recording; request it on first record if absent.
- IndexedDB: open database `teai` version 1, store `recordings` key path `id`; implement save, list, rename, delete with error handlers that show an inline message and preserve existing clips.
- Playback: object URL created on play, revoked on pause/end/delete; download uses an anchor with the sanitized name and recorded mimeType.
- Keep the existing field, nudges, and idea nodes unchanged; load `recording.js` before the inline script.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/recording_ui.test.js`
Expected: PASS — 1 test.

---

### Task 3: Docs, verification, and commit

**Files:**
- Modify: `README.md`
- Test: `tests/*.test.js`

**Interfaces:**
- Consumes: Task 1 helpers and Task 2 UI.
- Produces: committed working app.

- [ ] **Step 1: Update README**

Document how to record, name, play, rename, download, and delete clips; state that audio is stored only in this browser's IndexedDB and never uploaded; note that names are labels, not training data. Add the new JS helper names to the JavaScript API section.

- [ ] **Step 2: Run all tests**

Run: `node --test tests/*.test.js`
Expected: PASS — 14 tests.

- [ ] **Step 3: Verify the app still serves**

Run: `curl.exe -s -o NUL -w "%{http_code}" "http://127.0.0.1:42000/api/teai/index.html"`
Expected: `200`.

- [ ] **Step 4: Commit**

```bash
git add README.md index.html recording.js tests
git commit -m "feat: add named audio recordings library"
```

- [ ] **Step 5: Exit checklist**

Re-open `AGENTS.md`; confirm destination is `C:\pinokio\api\teai`, no launcher scripts were added, no external URLs appeared in `index.html`, no secrets were committed, and the full suite passes.
