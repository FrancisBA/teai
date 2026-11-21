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
