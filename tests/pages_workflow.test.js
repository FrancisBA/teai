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
