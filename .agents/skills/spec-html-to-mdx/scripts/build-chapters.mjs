import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    input:            { type: 'string' },
    'content-dir':    { type: 'string', default: 'content' },
    'lib-dir':        { type: 'string', default: 'lib/spec' },
    'public-img-dir': { type: 'string', default: 'public/img' },
    'base-path':      { type: 'string', default: '' },
  },
})
if (!values.input) {
  console.error('build-chapters: --input <spec.html> is required')
  process.exit(1)
}
const SPEC_FILE = path.resolve(values.input)
const SPEC_IMG_DIR = path.join(path.dirname(SPEC_FILE), 'img')
const CONTENT_DIR = path.resolve(values['content-dir'])
const LIB_DIR = path.resolve(values['lib-dir'])
const PUBLIC_IMG_DIR = path.resolve(values['public-img-dir'])
// Baked into xref hrefs at build time. Empty for local dev (URLs are root-
// relative), '/ecma262/draft' / '/ecma262/es2025' / … in CI per site.
const BASE_PATH = values['base-path']

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
  // `back-matter` annexes (Bibliography, Colophon) are unlettered in ecmarkup.
  const backMatter = /\bback-matter\b/.test(s.attrs)
  chapters.push({ id, title, inner, kind: s.tag, backMatter })
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

// Decode the named HTML entities that ecmarkup actually uses in headings —
// enough for the spec's "&lt;&lt;", "&infin;", "&ldquo;" etc. without pulling
// in a full HTML entity table. Numeric refs (&#123; / &#xAB;) covered too.
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&infin;/g, '∞')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&amp;/g, '&') // must be last so we don't double-decode
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
    // Inline anchor before the heading text so #<spec-id> resolves to the
    // start of the heading after navigation. Use <span>, not <a>: Nextra's
    // TOC wraps each heading's content in its own <a href="#…">, and a
    // nested <a> inside that is invalid HTML. Any element with `id` works
    // as a fragment target.
    const anchor = child.id ? `<span id="${child.id}" /> ` : ''
    // Run inline ecmarkup markup on the heading text too (it's stripped to
    // plain text earlier but still contains `_x_`, `*foo*`, ~enum~, etc.),
    // and let MDX parse the resulting <var>/<b>/<emu-…> tags inline.
    lines.push(`${hashes} ${anchor}${childNum} ${transformInlineText(child.title)}`)
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
    // back-matter annexes stay unnumbered (and don't consume a letter).
    chapterNum = c.backMatter ? '' : annexLabel(annexIdx++)
  }
  const tree = parseTree(c.inner)
  idToSection.set(c.id, { number: chapterNum, slug: pageSlug })
  registerSectionIds(tree, chapterNum, pageSlug, idToSection)
  return { ...c, slug, pageSlug, chapterNum, tree }
})

// emu-intro lives at <basePath>/, all other chapters at <basePath>/<slug>.
// Helper used by xref substitution so links survive routing under any
// basePath (empty for local dev, '/ecma262/draft' / '/ecma262/es2025' / … in
// production).
function pathFor(slug) {
  const local = slug === 'index' ? '' : `/${slug}`
  return `${BASE_PATH}${local}`
}

// <emu-xref href="#id"> is ecmarkup's cross-reference tag. Two source forms:
//   <emu-xref href="#id"></emu-xref>       — empty, ecmarkup injects "14.7.2"
//   <emu-xref href="#id">link text</emu-xref> — author-supplied text
// We rewrite both to <a href="/<slug>#<id>">…</a>. Anchors `id="<id>"` are
// emitted on chapter/section headings in MDX (see renderMdxTree below) so
// the targets exist.
function applyXrefSubst(html) {
  html = html.replace(/<emu-xref([^>]*?)>\s*<\/emu-xref>/g, (full, attrs) => {
    const m = attrs.match(/\bhref="#([^"]+)"/)
    if (!m) return full
    const s = idToSection.get(m[1])
    if (!s) return m[1]
    return `<a href="${pathFor(s.slug)}#${m[1]}">${s.number}</a>`
  })
  html = html.replace(/<emu-xref([^>]*?)>([\s\S]+?)<\/emu-xref>/g, (full, attrs, inner) => {
    const m = attrs.match(/\bhref="#([^"]+)"/)
    if (!m) return full
    const s = idToSection.get(m[1])
    if (!s) return inner
    return `<a href="${pathFor(s.slug)}#${m[1]}">${inner}</a>`
  })
  return html
}

// Build a map of nonterminal LHS → rendered production HTML by scanning every
// canonical <emu-grammar type="definition"> block (excluding `example` ones,
// which are illustrative snippets in the notational-conventions chapter, not
// the real grammar). Each block may pack multiple productions separated by
// blank lines; split them so a prodref resolves to just its own production.
const grammarDefs = new Map()
{
  const grammarRe = /<emu-grammar([^>]*?)>([\s\S]*?)<\/emu-grammar>/g
  let gm
  while ((gm = grammarRe.exec(src)) !== null) {
    const attrs = gm[1]
    if (!/\btype="definition"/.test(attrs)) continue
    if (/\bexample\b/.test(attrs)) continue
    const inner = gm[2]
    // Split into productions on blank lines; trim each chunk of surrounding
    // blank lines while preserving the indentation of content lines.
    const chunks = inner.split(/\n[ \t]*\n/)
    for (const raw of chunks) {
      // Drop leading comment lines (ecmarkup-format pragmas like
      // "// emu-format ignore") that sit between blank-line separators and
      // the actual LHS, so we don't misread them as the production head.
      const chunk = raw
        .replace(/^(?:[ \t]*\n|[ \t]*\/\/[^\n]*\n)+/, '')
        .replace(/\n+[ \t]*$/, '')
      if (!chunk.trim()) continue
      const firstLine = chunk.split('\n')[0]
      const lhsMatch = firstLine.match(/^\s*([A-Za-z][A-Za-z0-9_]*)(?:\s*\[[^\]]*\])?\s*::*/)
      if (!lhsMatch) continue
      const lhs = lhsMatch[1]
      const lines = chunk.split('\n')
      const indents = lines.filter((l) => l.trim() !== '').map((l) => l.match(/^[ \t]*/)[0].length)
      const minIndent = indents.length ? Math.min(...indents) : 0
      const dedented = lines.map((l) => l.slice(minIndent)).join('\n')
      // Longest production wins when multiple definitions exist (the canonical
      // one tends to list more alternatives).
      const existing = grammarDefs.get(lhs)
      if (!existing || dedented.length > existing.length) {
        grammarDefs.set(lhs, dedented)
      }
    }
  }
}

// Replace empty <emu-prodref name="X"></emu-prodref> with its production text
// wrapped in <pre> so line breaks and indentation survive raw-HTML embedding.
function applyProdrefSubst(html) {
  return html.replace(/<emu-prodref([^>]*?)>\s*<\/emu-prodref>/g, (full, attrs) => {
    const m = attrs.match(/\bname="([^"]+)"/)
    if (!m) return full
    const def = grammarDefs.get(m[1])
    if (def === undefined) return full
    return `<pre class="emu-grammar">${tokenizeGrammarBlock(def)}</pre>`
  })
}

// Strip a common leading indent from every non-blank line in `text`.
function dedent(text) {
  const lines = text.split('\n')
  const indents = lines.filter((l) => l.trim() !== '').map((l) => l.match(/^[ \t]*/)[0].length)
  const minIndent = indents.length ? Math.min(...indents) : 0
  return lines.map((l) => l.slice(minIndent)).join('\n')
}

// Parse <emu-alg> body (Markdown-style "1." numbered + "*" bulleted lists
// with 2-space indent per nesting level) into real nested <ol>/<ul> HTML, so
// the browser renders proper hierarchical step numbering.
function parseAlg(inner) {
  const lines = inner.split('\n')
  // The first bullet line establishes baseline indent (level 0).
  let baseIndent = -1
  for (const l of lines) {
    const t = l.trimStart()
    if (/^1\.\s/.test(t) || /^\*\s/.test(t)) {
      baseIndent = l.length - t.length
      break
    }
  }
  if (baseIndent === -1) return null

  const items = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    const t = l.trimStart()
    const olM = /^1\.\s+(.*)$/.exec(t)
    const ulM = /^\*\s+(.*)$/.exec(t)
    if (!olM && !ulM) {
      i++
      continue
    }
    const indent = l.length - t.length
    const depth = Math.max(0, Math.floor((indent - baseIndent) / 2))
    const type = olM ? 'ol' : 'ul'
    let text = (olM ? olM[1] : ulM[1]).replace(/^(?:\[[^\]]+\]\s*)+/, '')
    // Continuation lines: any non-bullet line at deeper indent belongs to this
    // item (commonly embedded <figure>/<table> blocks).
    let j = i + 1
    while (j < lines.length) {
      const nt = lines[j].trimStart()
      if (nt === '') { text += '\n'; j++; continue }
      const nIndent = lines[j].length - nt.length
      if (nIndent <= indent) break
      if (/^1\.\s/.test(nt) || /^\*\s/.test(nt)) break
      text += '\n' + lines[j]
      j++
    }
    items.push({ depth, type, text: text.replace(/\s+$/, '') })
    i = j
  }
  if (!items.length) return null

  // Build a tree: stack[d] is the parent node at depth d.
  const root = { children: [] }
  const stack = [root]
  for (const it of items) {
    while (stack.length > it.depth + 1) stack.pop()
    while (stack.length < it.depth + 1) {
      const parent = stack[stack.length - 1]
      if (!parent.children.length) {
        parent.children.push({ type: it.type, text: '', children: [] })
      }
      stack.push(parent.children[parent.children.length - 1])
    }
    stack[stack.length - 1].children.push({ type: it.type, text: it.text, children: [] })
  }

  // Serialize: group consecutive same-type siblings into a single <ol>/<ul>.
  function serialize(nodes) {
    let html = ''
    let k = 0
    while (k < nodes.length) {
      const t = nodes[k].type
      const group = []
      while (k < nodes.length && nodes[k].type === t) {
        group.push(nodes[k])
        k++
      }
      html += `<${t}>` + group.map((n) => `<li>${n.text}${serialize(n.children)}</li>`).join('') + `</${t}>`
    }
    return html
  }
  return serialize(root.children)
}

function applyAlgSubst(html) {
  return html.replace(/<emu-alg([^>]*?)>([\s\S]*?)<\/emu-alg>/g, (full, attrs, inner) => {
    const list = parseAlg(inner)
    if (list === null) return full
    return `<emu-alg${attrs}>${list}</emu-alg>`
  })
}

// Tokenize one grammar source line into wrapped HTML spans. `isLhs` flags the
// first non-blank line of a production so the leading nonterminal gets a
// distinct ".nt.lhs" class for bolding.
//   • // ...           → <span class="cm">…</span>           (ecmarkup pragma)
//   • &gt; rest of line → <span class="desc">…</span>         (prose description)
//   • `foo`            → <span class="t">foo</span>            (terminal)
//   • [Yield, ?Await]  → <span class="p">[…]</span>            (params / constraint)
//   • :, ::, :::, :::: → <span class="geq">…</span>            (production arrow)
//   • [A-Z]\w*         → <span class="nt">…</span>             (nonterminal)
//   • ? * +            → <span class="mod">…</span>            (modifier)
//   • "one of"         → <span class="oneof">one of</span>
// Whitespace is preserved verbatim so the <pre>'s line shape survives.
function tokenizeGrammarLine(line, isLhs) {
  if (!line.trim()) return line
  if (/^\s*\/\//.test(line)) return `<span class="cm">${line}</span>`
  const descM = line.match(/^([ \t]*)(&gt;\s.*)$/)
  if (descM) return `${descM[1]}<span class="desc">${descM[2]}</span>`

  let out = ''
  let i = 0
  let lhsClaimed = !isLhs
  while (i < line.length) {
    const ch = line[i]
    if (ch === ' ' || ch === '\t') {
      out += ch
      i++
      continue
    }
    if (ch === '`') {
      const end = line.indexOf('`', i + 1)
      if (end === -1) {
        out += ch
        i++
        continue
      }
      out += `<span class="t">${line.slice(i + 1, end)}</span>`
      i = end + 1
      continue
    }
    if (ch === '[') {
      const end = line.indexOf(']', i + 1)
      if (end === -1) {
        out += ch
        i++
        continue
      }
      out += `<span class="p">[${line.slice(i + 1, end)}]</span>`
      i = end + 1
      continue
    }
    if (ch === ':') {
      let j = i
      while (j < line.length && line[j] === ':') j++
      out += `<span class="geq">${line.slice(i, j)}</span>`
      i = j
      continue
    }
    if (/[A-Z]/.test(ch)) {
      let j = i + 1
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++
      const cls = lhsClaimed ? 'nt' : 'nt lhs'
      out += `<span class="${cls}">${line.slice(i, j)}</span>`
      lhsClaimed = true
      i = j
      continue
    }
    if (ch === '?' || ch === '*' || ch === '+') {
      out += `<span class="mod">${ch}</span>`
      i++
      continue
    }
    if (
      line.slice(i, i + 6) === 'one of' &&
      (i + 6 === line.length || !/[A-Za-z0-9_]/.test(line[i + 6]))
    ) {
      out += '<span class="oneof">one of</span>'
      i += 6
      continue
    }
    out += ch
    i++
  }
  return out
}

// Tokenize a grammar block (one or more productions, blank-line separated).
// The first non-blank line after each blank is treated as a new LHS line so
// the nonterminal name gets the .lhs class.
function tokenizeGrammarBlock(text) {
  const out = []
  let expectLhs = true
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      out.push(line)
      expectLhs = true
      continue
    }
    out.push(tokenizeGrammarLine(line, expectLhs))
    expectLhs = false
  }
  return out.join('\n')
}

// Render <emu-grammar> blocks with token-aware tokenization so non-terminals,
// terminals, parameters, geqs, modifiers, and descriptions are individually
// styleable via CSS (see app/ecma-spec.css). The same tag is used both inline
// (mid-paragraph "MV of <emu-grammar>DecimalDigit :: `0`</emu-grammar>") and
// as a block-level definition; tell them apart by looking at what precedes
// the opening tag — only-whitespace → <pre>, otherwise inline <code>.
function applyGrammarSubst(html) {
  return html.replace(
    /<emu-grammar([^>]*?)>([\s\S]*?)<\/emu-grammar>/g,
    (full, _attrs, inner, offset, source) => {
      const lineStart = source.lastIndexOf('\n', offset - 1) + 1
      const isBlock = source.slice(lineStart, offset).trim() === ''
      const trimmed = inner.replace(/^\s*\n/, '').replace(/\n\s*$/, '')
      if (isBlock) {
        return `<pre class="emu-grammar">${tokenizeGrammarBlock(dedent(trimmed))}</pre>`
      }
      return `<code class="emu-grammar">${tokenizeGrammarBlock(trimmed.trim())}</code>`
    },
  )
}

// Inline ecmarkup markup: a Markdown-like shorthand authors use in regular
// prose, emu-alg step text, emu-eqn equations, table cells, etc. ecmarkup
// expands these to typed inline elements at build time; we do the same so
// readers see italic variables, bold spec values, monospace terminals, etc.
//
//   `foo`     → <code>foo</code>
//   |Foo|     → <emu-nt>Foo</emu-nt>          (nonterminal, italic via CSS)
//   ~enum~    → <emu-const>enum</emu-const>   (small-caps via CSS)
//   %Foo.Bar% → <code class="emu-intrinsic">%Foo.Bar%</code>
//   *foo*     → <b>foo</b>
//   _x_       → <var>x</var>
//
// We tokenize the HTML and skip text inside <pre>/<code>/<emu-grammar>/<emu-not-ref>
// so literal content (grammar bodies, code samples) isn't accidentally rewritten.
const inlineSkipTags = new Set(['pre', 'code', 'emu-grammar', 'emu-not-ref', 'script', 'style'])

function transformInlineText(text) {
  // Pull backtick-wrapped runs out first and replace them with a NUL-marker
  // placeholder so the later `*` / `_` regexes can't reach across the
  // generated <code>…</code> boundaries (e.g. `*` adjacent to `**` is the
  // case in ApplyStringOrNumericBinaryOperator's heading).
  const code = []
  let out = text.replace(/`([^`\n]+)`/g, (_, c) => {
    code.push(c)
    return `\x00${code.length - 1}\x00`
  })
  out = out.replace(/\|([A-Za-z][A-Za-z0-9_]*(?:\[[^\]]*\])?\??)\|/g, '<emu-nt>$1</emu-nt>')
  out = out.replace(/~([^\s~][^~]*?)~/g, '<emu-const>$1</emu-const>')
  out = out.replace(/%([A-Za-z][A-Za-z0-9.@]*)%/g, '<emu-intrinsic>%$1%</emu-intrinsic>')
  out = out.replace(/\*([^*\s][^*]*?[^*\s]|[^*\s])\*/g, '<b>$1</b>')
  out = out.replace(/(?<![A-Za-z0-9_])_([A-Za-z][A-Za-z0-9_]*)_(?![A-Za-z0-9_])/g, '<var>$1</var>')
  return out.replace(/\x00(\d+)\x00/g, (_, i) => `<code>${code[Number(i)]}</code>`)
}

function applyInlineMarkup(html) {
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>|<!--[\s\S]*?-->/g
  let out = ''
  let last = 0
  let skipDepth = 0
  let m
  while ((m = tagRe.exec(html)) !== null) {
    const text = html.slice(last, m.index)
    out += skipDepth === 0 ? transformInlineText(text) : text
    out += m[0]
    if (m[1]) {
      const tag = m[1].toLowerCase()
      if (inlineSkipTags.has(tag)) {
        if (m[0].startsWith('</')) skipDepth = Math.max(0, skipDepth - 1)
        else if (!m[0].endsWith('/>')) skipDepth++
      }
    }
    last = tagRe.lastIndex
  }
  const tail = html.slice(last)
  out += skipDepth === 0 ? transformInlineText(tail) : tail
  return out
}

fs.rmSync(CONTENT_DIR, { recursive: true, force: true })
fs.rmSync(LIB_DIR, { recursive: true, force: true })
fs.mkdirSync(CONTENT_DIR, { recursive: true })
fs.mkdirSync(LIB_DIR, { recursive: true })

const meta = {}
let totalBytes = 0
built.forEach((c) => {
  const { slug, pageSlug, chapterNum, tree } = c
  const sections = flattenTree(tree).map(([k, v]) => [
    k,
    applyInlineMarkup(applyXrefSubst(applyProdrefSubst(applyGrammarSubst(applyAlgSubst(v))))),
  ])
  const sectionsObj = Object.fromEntries(sections)

  // basePath is already baked into href values in this map (see pathFor in
  // build-chapters.mjs), so the runtime is just lookup + dangerouslySetInnerHTML.
  const componentSrc = [
    '// Generated from ecma262/spec.html — do not edit by hand.',
    `const sections = ${JSON.stringify(sectionsObj)};`,
    'export function Sec({ id }) {',
    "  const html = sections[id] ?? '';",
    '  return <div className="ecma-spec" dangerouslySetInnerHTML={{ __html: html }} />;',
    '}',
    '',
  ].join('\n')
  fs.writeFileSync(path.join(LIB_DIR, `${slug}.jsx`), componentSrc)
  totalBytes += componentSrc.length

  const chapterAnchor = `<span id="${c.id}" /> `
  const chapterTitleRich = transformInlineText(c.title)
  let chapterHeading
  if (c.kind === 'emu-intro') {
    chapterHeading = `# ${chapterAnchor}${chapterTitleRich}`
  } else if (c.kind === 'emu-annex') {
    chapterHeading = c.backMatter
      ? `# ${chapterAnchor}${chapterTitleRich}`
      : `# ${chapterAnchor}Annex ${chapterNum} ${chapterTitleRich}`
  } else {
    chapterHeading = `# ${chapterAnchor}${chapterNum} ${chapterTitleRich}`
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

  // Sidebar label is plain text rendered by Nextra, so decode entities
  // (e.g. "&lt;&lt;" → "<<") and leave ecmarkup shorthand alone — markup
  // tags would show up as literal text in the sidebar.
  const titlePlain = decodeEntities(c.title)
  const display = c.kind === 'emu-intro'
    ? titlePlain
    : c.kind === 'emu-annex'
      ? (c.backMatter ? titlePlain : `Annex ${chapterNum}: ${titlePlain}`)
      : `${chapterNum} ${titlePlain}`
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
