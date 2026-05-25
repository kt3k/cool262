// Combine every site's static export into a single dist/ for GitHub Pages.
//
//   packages/site-<id>/out/  ->  dist/<id>/
//   dist/index.html          <- landing page linking to each version
//
// Run from anywhere after `pnpm build:all`; paths resolve off the repo root.
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../../..')
const packagesDir = path.join(root, 'packages')
const distDir = path.join(root, 'dist')

// Each site's display name lives in its app/layout.jsx as the single source of
// truth (`const siteTitle = '...'`); reuse it here so the landing page never
// drifts from the per-site <title>/logo.
function readSiteTitle(siteDir, fallback) {
  const layout = fs.readFileSync(path.join(siteDir, 'app/layout.jsx'), 'utf8')
  const m = layout.match(/const siteTitle = '([^']*)'/)
  return m ? m[1] : fallback
}

const sites = fs
  .readdirSync(packagesDir)
  .filter((name) => name.startsWith('site-'))
  .map((name) => {
    const id = name.slice('site-'.length)
    const dir = path.join(packagesDir, name)
    return { id, dir, title: readSiteTitle(dir, id) }
  })

if (sites.length === 0) {
  console.error('[assemble-dist] no packages/site-* found')
  process.exit(1)
}

fs.rmSync(distDir, { recursive: true, force: true })
fs.mkdirSync(distDir, { recursive: true })

for (const site of sites) {
  const out = path.join(site.dir, 'out')
  if (!fs.existsSync(out)) {
    console.error(
      `[assemble-dist] missing build output: ${out}\n` +
        '  run `pnpm build:all` first',
    )
    process.exit(1)
  }
  fs.cpSync(out, path.join(distDir, site.id), { recursive: true })
}

// Newest first on the landing page: draft on top, then descending version id.
const ordered = [...sites].sort((a, b) => {
  if (a.id === 'draft') return -1
  if (b.id === 'draft') return 1
  return b.id.localeCompare(a.id)
})

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const items = ordered
  .map((s) => `      <li><a href="./${s.id}/">${escape(s.title)}</a></li>`)
  .join('\n')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ECMA-262 — all editions</title>
  <style>
    body { font: 16px/1.6 system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem; }
    h1 { font-size: 1.4rem; }
    ul { list-style: none; padding: 0; }
    li { margin: 0.5rem 0; }
    a { text-decoration: none; color: #0366d6; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>ECMA-262</h1>
  <ul>
${items}
  </ul>
</body>
</html>
`

fs.writeFileSync(path.join(distDir, 'index.html'), html)
console.log(`[assemble-dist] assembled dist/ from ${sites.length} sites`)
