const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')

test('interface markup is self-contained and ambient', () => {
  for (const fragment of ['<canvas', 'resonance.js', 'getUserMedia', 'keydown', 'localStorage']) {
    assert.ok(html.includes(fragment), `missing ${fragment}`)
  }
  assert.ok(!html.includes('http://'), 'unexpected external http URL')
  assert.ok(!html.includes('https://'), 'unexpected external https URL')
})
