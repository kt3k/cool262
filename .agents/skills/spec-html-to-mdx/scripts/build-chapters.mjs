import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SPEC_FILE = path.join(ROOT, 'ecma262/spec.html')
const CONTENT_DIR = path.join(ROOT, 'content/spec')
const LIB_DIR = path.join(ROOT, 'lib/spec')

const src = fs.readFileSync(SPEC_FILE, 'utf8')

// Find top-level chapters: <emu-intro>, <emu-clause>, <emu-annex> opening at column 0.
const startRe = /^<(emu-(?:intro|clause|annex))\b([^>]*)>$/gm
const starts = []
let m
while ((m = startRe.exec(src)) !== null) {
  starts.push({ tag: m[1], attrs: m[2], offset: m.index })
}
if (starts.length === 0) throw new Error('No top-level chapters found')

const bodyClose = src.lastIndexOf('</body>')
const tailEnd = bodyClose >= 0 ? bodyClose : src.length

const chapters = []
for (let i = 0; i < starts.length; i++) {
  const s = starts[i]
  const e = i + 1 < starts.length ? starts[i + 1].offset : tailEnd
  const block = src.slice(s.offset, e).trimEnd()
  const open = block.match(/^<emu-(?:intro|clause|annex)\b[^>]*>/)
  const close = block.match(/<\/emu-(?:intro|clause|annex)>\s*$/)
  if (!open || !close) {
    throw new Error(`Chapter ${i} (${s.tag}) missing open/close at offset ${s.offset}`)
  }
  let inner = block.slice(open[0].length, block.length - close[0].length).trim()
  const idMatch = s.attrs.match(/\bid="([^"]+)"/)
  const id = idMatch ? idMatch[1] : `chapter-${i}`
  const titleMatch = inner.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  const titleHtml = titleMatch ? titleMatch[1] : id
  const title = titleHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || id
  // Strip the leading h1 since we render the title separately as a markdown heading.
  if (titleMatch) {
    inner = inner.slice(0, titleMatch.index) + inner.slice(titleMatch.index + titleMatch[0].length)
    inner = inner.replace(/^\s+/, '')
  }
  chapters.push({ id, title, inner, kind: s.tag })
}

fs.rmSync(CONTENT_DIR, { recursive: true, force: true })
fs.rmSync(LIB_DIR, { recursive: true, force: true })
fs.mkdirSync(CONTENT_DIR, { recursive: true })
fs.mkdirSync(LIB_DIR, { recursive: true })

const meta = {}
let totalBytes = 0
chapters.forEach((c, i) => {
  const slug = c.id.replace(/^sec-/, '')
  const num = String(i).padStart(2, '0')

  const componentName = 'Chapter' + slug.replace(/[^a-zA-Z0-9]/g, '_')
  const componentSrc =
    `// Generated from ecma262/spec.html — do not edit by hand.\n` +
    `const html = ${JSON.stringify(c.inner)};\n` +
    `export default function ${componentName}() {\n` +
    `  return <div className="ecma-spec" dangerouslySetInnerHTML={{ __html: html }} />;\n` +
    `}\n`
  fs.writeFileSync(path.join(LIB_DIR, `${slug}.jsx`), componentSrc)
  totalBytes += componentSrc.length

  const mdx =
    `import Content from '../../lib/spec/${slug}'\n\n` +
    `# ${c.title}\n\n` +
    `<Content />\n`
  fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.mdx`), mdx)

  // Prefix display title with a number for clarity in the sidebar.
  const display = c.kind === 'emu-intro'
    ? c.title
    : c.kind === 'emu-annex'
      ? `Annex: ${c.title}`
      : `${i}. ${c.title}`
  meta[slug] = display
})

fs.writeFileSync(
  path.join(CONTENT_DIR, '_meta.js'),
  `export default ${JSON.stringify(meta, null, 2)}\n`
)

console.log(`Generated ${chapters.length} chapters (${(totalBytes / 1024 / 1024).toFixed(2)} MB of JSX)`)
