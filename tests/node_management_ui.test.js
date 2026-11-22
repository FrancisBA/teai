const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')

test('idea nodes expose delete and clear controls', () => {
  for (const fragment of [
    'id="clearNodes"', 'clear ideas', "className = 'node-delete'",
    "remove.textContent = '×'", "aria-label', 'delete idea'"
  ]) {
    assert.ok(html.includes(fragment), `missing ${fragment}`)
  }
})

test('nodes use a sequence-derived hue custom property', () => {
  assert.ok(html.includes('R.nodeHue(node.sequence)'))
  assert.ok(html.includes("setProperty('--node-hue'"))
  assert.match(html, /hsla\(var\(--node-hue/)
})

test('delete control does not start a drag', () => {
  assert.match(html, /event\.target\.closest\('\.node-delete'\)/)
  assert.match(html, /remove\.addEventListener\('click'[\s\S]{0,160}stopPropagation\(\)/)
})

test('nodes are draggable with a movement threshold', () => {
  for (const fragment of [
    'setPointerCapture', "addEventListener('pointermove'", "addEventListener('pointerup'",
    "addEventListener('pointercancel'", 'touch-action: none', 'Math.hypot(dx, dy) < 4'
  ]) {
    assert.ok(html.includes(fragment), `missing ${fragment}`)
  }
  assert.ok(html.includes('R.moveNode(state.nodes'))
})

test('every node mutation is persisted', () => {
  const saves = html.match(/R\.saveNodes\(state\.nodes, localStorage\)/g) || []
  assert.ok(saves.length >= 3, `expected delete, clear, and drag saves, got ${saves.length}`)
  assert.ok(html.includes('nodeLayer.replaceChildren()'))
})

test('undo toast is present and announced', () => {
  for (const fragment of [
    'id="undoToast"', 'id="undoMessage"', 'id="undoButton"', 'aria-live="polite"', 'hidden'
  ]) {
    assert.ok(html.includes(fragment), `missing ${fragment}`)
  }
  assert.match(html, /#undoToast\s*\{/)
})

test('destructive actions snapshot nodes through one helper', () => {
  const captures = html.match(/R\.captureNodes\(state\.nodes\)/g) || []
  assert.equal(captures.length, 1, 'expected one shared captureUndo call')
  const calls = html.match(/captureUndo\('[^']+'\)/g) || []
  assert.deepEqual(calls, ["captureUndo('idea removed')", "captureUndo('ideas cleared')"])
})

test('undo toast lifecycle clears and replaces snapshots', () => {
  for (const fragment of [
    'let undoSnapshot = null', 'let undoTimer = null',
    'window.clearTimeout(undoTimer)', 'window.setTimeout(dismissUndo, 6000)',
    'undoToast.hidden = true', 'undoSnapshot = null'
  ]) {
    assert.ok(html.includes(fragment), `missing ${fragment}`)
  }
})

test('undo restores copied nodes, rerenders, and persists', () => {
  assert.ok(html.includes('state.nodes = undoSnapshot'))
  assert.ok(html.includes('renderAllNodes()'))
  assert.ok(html.includes('nodeLayer.replaceChildren()'))
  assert.match(html, /function undoLastAction\(\)[\s\S]{0,240}R\.saveNodes\(state\.nodes, localStorage\)/)
  assert.match(html, /undoButton\.addEventListener\('click', undoLastAction\)/)
})

test('restore uses the shared node renderer', () => {
  assert.match(html, /function restoreNodes\(\)[\s\S]{0,200}state\.nodes = saved/)
  assert.match(html, /function restoreNodes\(\)[\s\S]{0,260}renderAllNodes\(\)/)
})

test('undo toast does not intercept input taps', () => {
  const toastRule = html.match(/#undoToast\s*\{([^}]*)\}/)[1]
  assert.match(toastRule, /pointer-events:\s*none/)
  const buttonRule = html.match(/#undoButton\s*\{([^}]*)\}/)[1]
  assert.match(buttonRule, /pointer-events:\s*auto/)
})

test('undo toast declares a status role', () => {
  assert.match(html, /id="undoToast"[^>]*role="status"/)
})
