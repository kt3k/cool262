import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SPEC_FILE = path.join(ROOT, 'ecma262/spec.html')
const SPEC_IMG_DIR = path.join(ROOT, 'ecma262/img')
const CONTENT_DIR = path.join(ROOT, 'content')
const LIB_DIR = path.join(ROOT, 'lib/spec')
const PUBLIC_IMG_DIR = path.join(ROOT, 'public/img')

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

// Locate the first nested section opener (<emu-clause or <emu-annex) at or
// after `from`. Returns { idx, tag } or null. Skips matches that are inside
// attribute values by requiring the next char to terminate the tag name.
function findNextSection(html, from) {
  let i = from
  while (i < html.length) {
    const a = html.indexOf('<emu-clause', i)
    const b = html.indexOf('<emu-annex', i)
    const idx = a === -1 ? b : b === -1 ? a : Math.min(a, b)
    if (idx === -1) return null
    const tag = (a !== -1 && idx === a) ? 'emu-clause' : 'emu-annex'
    const next = html.charCodeAt(idx + 1 + tag.length)
    // Valid tag boundary: whitespace or '>'
    if (next === 0x20 || next === 0x09 || next === 0x0A || next === 0x0D || next === 0x3E) {
      return { idx, tag }
    }
    i = idx + 1
  }
  return null
}

// Recursively split inner HTML into a tree of nested <emu-clause>/<emu-annex>
// subsections. Returns { pre, children: [{ id, title, tree }] } where `pre`
// is the HTML before the first nested section.
function parseTree(html) {
  const children = []
  let pre = ''
  let i = 0
  while (i < html.length) {
    const found = findNextSection(html, i)
    if (!found) {
      const rest = html.slice(i)
      if (children.length === 0) pre += rest
      else if (rest.trim() !== '') children[children.length - 1].tree.pre += rest
      break
    }
    const { idx: openIdx, tag } = found
    const openClose = `</${tag}>`
    const openEnd = html.indexOf('>', openIdx)
    if (openEnd === -1) throw new Error(`Malformed <${tag}>`)
    const openTag = html.slice(openIdx, openEnd + 1)
    let depth = 1
    let j = openEnd + 1
    let innerEnd = -1
    while (depth > 0) {
      const nextOpenInfo = findNextSection(html, j)
      const nextClose = html.indexOf(openClose, j)
      if (nextClose === -1) throw new Error(`Unclosed <${tag}>`)
      const sameTagOpen = nextOpenInfo && nextOpenInfo.tag === tag ? nextOpenInfo.idx : -1
      if (sameTagOpen !== -1 && sameTagOpen < nextClose) {
        depth++
        j = sameTagOpen + tag.length + 1
      } else {
        depth--
        if (depth === 0) {
          innerEnd = nextClose
          j = nextClose + openClose.length
          break
        }
        j = nextClose + openClose.length
      }
    }
    const innerStart = openEnd + 1
    const innerHtml = html.slice(innerStart, innerEnd)
    const attrs = openTag.slice(tag.length + 1, -1)
    const idMatch = attrs.match(/\bid="([^"]+)"/)
    const id = idMatch ? idMatch[1] : ''
    const titleMatch = innerHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
    const titleHtml = titleMatch ? titleMatch[1] : id
    const title = titleHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    const innerStripped = titleMatch
      ? (innerHtml.slice(0, titleMatch.index) + innerHtml.slice(titleMatch.index + titleMatch[0].length)).replace(/^\s+/, '')
      : innerHtml
    const preText = html.slice(i, openIdx)
    if (children.length === 0) pre += preText
    else if (preText.trim() !== '') children[children.length - 1].tree.pre += preText
    children.push({ id, title, tree: parseTree(innerStripped) })
    i = j
  }
  return { pre, children }
}

// Walk the tree and collect [secPath, html] entries.
function flattenTree(tree, prefix = '') {
  const sections = [[prefix, tree.pre]]
  tree.children.forEach((child, idx) => {
    const newPrefix = prefix === '' ? String(idx + 1) : `${prefix}.${idx + 1}`
    sections.push(...flattenTree(child.tree, newPrefix))
  })
  return sections
}

// A=0, B=1, ..., Z=25, AA=26, AB=27, ...
function annexLabel(n) {
  let s = ''
  let x = n
  while (true) {
    s = String.fromCharCode(65 + (x % 26)) + s
    x = Math.floor(x / 26) - 1
    if (x < 0) break
  }
  return s
}

// Emit MDX lines: <Sec id=... /> for the current node, then heading + recurse for each child.
function renderMdxTree(tree, chapterPrefix, secPath, depth) {
  const lines = []
  if (tree.pre.trim() !== '') {
    lines.push(`<Sec id=${JSON.stringify(secPath)} />`)
    lines.push('')
  }
  tree.children.forEach((child, idx) => {
    const childSecPath = secPath === '' ? String(idx + 1) : `${secPath}.${idx + 1}`
    const childNum = chapterPrefix === '' ? childSecPath : `${chapterPrefix}.${childSecPath}`
    const hashes = '#'.repeat(Math.min(depth, 6))
    lines.push(`${hashes} ${childNum} ${child.title}`)
    lines.push('')
    lines.push(...renderMdxTree(child.tree, chapterPrefix, childSecPath, depth + 1))
  })
  return lines
}

// Walk a tree and register every nested clause id → {number, slug} so we can
// resolve <emu-xref href="#id"> back to its rendered section number ("14.7.2").
function registerSectionIds(tree, chapPrefix, chapSlug, into) {
  tree.children.forEach((child, idx) => {
    const childPrefix = chapPrefix === '' ? String(idx + 1) : `${chapPrefix}.${idx + 1}`
    if (child.id) into.set(child.id, { number: childPrefix, slug: chapSlug })
    registerSectionIds(child.tree, childPrefix, chapSlug, into)
  })
}

// Pass 1: build chapter trees and a global id → section map, so cross-chapter
// xrefs can be resolved before any file is written.
let clauseIdx = 0
let annexIdx = 0
const idToSection = new Map()
const built = chapters.map((c) => {
  const slug = c.id.replace(/^sec-/, '')
  const pageSlug = c.kind === 'emu-intro' ? 'index' : slug
  let chapterNum = ''
  if (c.kind === 'emu-clause') {
    clauseIdx++
    chapterNum = String(clauseIdx)
  } else if (c.kind === 'emu-annex') {
    chapterNum = annexLabel(annexIdx++)
  }
  const tree = parseTree(c.inner)
  idToSection.set(c.id, { number: chapterNum, slug: pageSlug })
  registerSectionIds(tree, chapterNum, pageSlug, idToSection)
  return { ...c, slug, pageSlug, chapterNum, tree }
})

// Empty <emu-xref href="#id"></emu-xref> is filled in by ecmarkup at build
// time. Resolve it ourselves to the target's section number; fall back to the
// bare id so unresolved refs stay visible instead of vanishing.
function applyXrefSubst(html) {
  return html.replace(/<emu-xref([^>]*?)>\s*<\/emu-xref>/g, (full, attrs) => {
    const m = attrs.match(/\bhref="#([^"]+)"/)
    if (!m) return full
    const s = idToSection.get(m[1])
    return s ? s.number : m[1]
  })
}

fs.rmSync(CONTENT_DIR, { recursive: true, force: true })
fs.rmSync(LIB_DIR, { recursive: true, force: true })
fs.mkdirSync(CONTENT_DIR, { recursive: true })
fs.mkdirSync(LIB_DIR, { recursive: true })

const meta = {}
let totalBytes = 0
built.forEach((c) => {
  const { slug, pageSlug, chapterNum, tree } = c
  const sections = flattenTree(tree).map(([k, v]) => [k, applyXrefSubst(v)])
  const sectionsObj = Object.fromEntries(sections)

  const componentSrc =
    `// Generated from ecma262/spec.html — do not edit by hand.\n` +
    `const sections = ${JSON.stringify(sectionsObj)};\n` +
    `export function Sec({ id }) {\n` +
    `  const html = sections[id] ?? '';\n` +
    `  return <div className="ecma-spec" dangerouslySetInnerHTML={{ __html: html }} />;\n` +
    `}\n`
  fs.writeFileSync(path.join(LIB_DIR, `${slug}.jsx`), componentSrc)
  totalBytes += componentSrc.length

  let chapterHeading
  if (c.kind === 'emu-intro') {
    chapterHeading = `# ${c.title}`
  } else if (c.kind === 'emu-annex') {
    chapterHeading = `# Annex ${chapterNum} ${c.title}`
  } else {
    chapterHeading = `# ${chapterNum} ${c.title}`
  }

  const mdxLines = [
    `import { Sec } from '../lib/spec/${slug}'`,
    '',
    chapterHeading,
    '',
    ...renderMdxTree(tree, chapterNum, '', 2),
  ]
  const mdx = mdxLines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n*$/, '\n')
  fs.writeFileSync(path.join(CONTENT_DIR, `${pageSlug}.mdx`), mdx)

  const display = c.kind === 'emu-intro'
    ? c.title
    : c.kind === 'emu-annex'
      ? `Annex ${chapterNum}: ${c.title}`
      : `${chapterNum}. ${c.title}`
  meta[pageSlug] = display
})

fs.writeFileSync(
  path.join(CONTENT_DIR, '_meta.js'),
  `export default ${JSON.stringify(meta, null, 2)}\n`
)

// Mirror spec images to public/ so the spec HTML's <img src="img/..."> resolves.
fs.rmSync(PUBLIC_IMG_DIR, { recursive: true, force: true })
fs.mkdirSync(PUBLIC_IMG_DIR, { recursive: true })
let imgCount = 0
for (const name of fs.readdirSync(SPEC_IMG_DIR)) {
  if (/\.(svg|png|jpe?g|gif|webp|ico)$/i.test(name)) {
    fs.copyFileSync(path.join(SPEC_IMG_DIR, name), path.join(PUBLIC_IMG_DIR, name))
    imgCount++
  }
}

console.log(`Generated ${chapters.length} chapters (${(totalBytes / 1024 / 1024).toFixed(2)} MB of JSX), ${imgCount} images`)
