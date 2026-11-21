const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { syncSite } = require('../scripts/sync-site.js')

const names = ['index.html', 'resonance.js', 'recording.js']

function makeFixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teai-sync-'))
  const siteDir = path.join(rootDir, 'site')
  fs.mkdirSync(siteDir)
  for (const name of names) {
    fs.writeFileSync(path.join(rootDir, name), `source ${name}\n`)
    fs.writeFileSync(path.join(siteDir, name), `stale ${name}\n`)
  }
  return { rootDir, siteDir }
}

test('syncSite repairs stale files and restores .nojekyll', t => {
  const { rootDir, siteDir } = makeFixture()
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }))

  syncSite({ rootDir, siteDir })

  for (const name of names) {
    assert.equal(
      fs.readFileSync(path.join(siteDir, name), 'utf8'),
      fs.readFileSync(path.join(rootDir, name), 'utf8'),
      `${name} was not synced`
    )
  }
  assert.equal(fs.readFileSync(path.join(siteDir, '.nojekyll'), 'utf8'), '')
})
