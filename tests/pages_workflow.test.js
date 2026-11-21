const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const workflow = fs.readFileSync(
  path.join(__dirname, '..', '.github', 'workflows', 'deploy-pages.yml'),
  'utf8'
)

test('pages workflow deploys the static site on main', () => {
  assert.match(workflow, /branches:\s*\[\s*main\s*\]/)
  assert.match(workflow, /node --test tests\/\*\.test\.js/)
  assert.match(workflow, /path:\s*site/)
  assert.match(workflow, /actions\/upload-pages-artifact@v\d+/)
  assert.match(workflow, /actions\/deploy-pages@v\d+/)
  assert.match(workflow, /pages:\s*write/)
  assert.match(workflow, /id-token:\s*write/)
})

test('pages workflow syncs site before tests and upload', () => {
  const syncIndex = workflow.indexOf('node scripts/sync-site.js')
  const testIndex = workflow.indexOf('node --test tests/*.test.js')
  const uploadIndex = workflow.indexOf('actions/upload-pages-artifact')

  assert.ok(syncIndex >= 0, 'missing sync step')
  assert.ok(testIndex >= 0, 'missing test step')
  assert.ok(uploadIndex >= 0, 'missing upload step')
  assert.ok(syncIndex < testIndex, 'sync must run before tests')
  assert.ok(syncIndex < uploadIndex, 'sync must run before upload')
})
