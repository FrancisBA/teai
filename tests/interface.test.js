const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')
const launcher = fs.readFileSync(path.join(__dirname, '..', 'pinokio.js'), 'utf8')

test('launcher uses the Pinokio static asset route', () => {
  assert.match(launcher, /href:\s*["']\/asset\/api\/teai\/index\.html["']/)
})

test('interface markup is self-contained and ambient', () => {
  for (const fragment of ['<canvas', 'resonance.js', 'getUserMedia', 'keydown', 'localStorage']) {
    assert.ok(html.includes(fragment), `missing ${fragment}`)
  }
  assert.ok(!html.includes('http://'), 'unexpected external http URL')
  assert.ok(!html.includes('https://'), 'unexpected external https URL')
})

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
