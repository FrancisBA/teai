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
