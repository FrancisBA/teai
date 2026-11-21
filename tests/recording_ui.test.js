const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')

test('recording controls and library are present', () => {
  for (const fragment of [
    'MediaRecorder', 'indexedDB', 'record', 'stop', 'library', 'download',
    'Microphone access is required'
  ]) {
    assert.ok(html.includes(fragment), `missing ${fragment}`)
  }
})

test('a finished recording clears the active recorder', () => {
  const start = html.indexOf('recorder.onstop')
  const end = html.indexOf('recorder.start()', start)
  assert.ok(start > -1 && end > start, 'recorder lifecycle not found')
  assert.match(html.slice(start, end), /state\.recorder\s*=\s*null/)
})

test('an unsaved clip blocks a new recording', () => {
  assert.match(html, /if \(state\.pending\) \{[\s\S]{0,200}Save or discard/)
})

test('saved clips can be paused and resumed', () => {
  assert.ok(html.includes("'pause'"), 'missing pause action')
  assert.match(html, /state\.activeId\s*===\s*record\.id/)
})

test('save starts disabled and follows name validation', () => {
  assert.match(html, /id="saveClip"[^>]*disabled/)
  assert.match(html, /saveClipButton\.disabled\s*=\s*!Rec\.validateName/)
})
