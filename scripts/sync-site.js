const fs = require('node:fs')
const path = require('node:path')

const files = ['index.html', 'resonance.js', 'recording.js']

function syncSite({ rootDir = path.resolve(__dirname, '..'), siteDir = path.join(rootDir, 'site') } = {}) {
  fs.mkdirSync(siteDir, { recursive: true })
  const nojekyll = path.join(siteDir, '.nojekyll')
  if (!fs.existsSync(nojekyll)) fs.writeFileSync(nojekyll, '')
  for (const name of files) {
    fs.copyFileSync(path.join(rootDir, name), path.join(siteDir, name))
  }
}

if (require.main === module) syncSite()

module.exports = { syncSite }
