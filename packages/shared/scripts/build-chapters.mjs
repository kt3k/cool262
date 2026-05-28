import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    input: { type: "string" },
    "content-dir": { type: "string", default: "content" },
    "lib-dir": { type: "string", default: "lib/spec" },
    "public-img-dir": { type: "string", default: "public/img" },
    "base-path": { type: "string", default: "" },
  },
});
if (!values.input) {
  console.error("build-chapters: --input <spec.html> is required");
  process.exit(1);
}
const SPEC_FILE = path.resolve(values.input);
const SPEC_IMG_DIR = path.join(path.dirname(SPEC_FILE), "img");
const CONTENT_DIR = path.resolve(values["content-dir"]);
const LIB_DIR = path.resolve(values["lib-dir"]);
const PUBLIC_IMG_DIR = path.resolve(values["public-img-dir"]);
// Baked into xref hrefs at build time. Empty for local dev (URLs are root-
// relative), '/ecma262/draft' / '/ecma262/es2025' / … in CI per site.
const BASE_PATH = values["base-path"];

const src = fs.readFileSync(SPEC_FILE, "utf8");

// Find top-level chapters: <emu-intro>, <emu-clause>, <emu-annex> opening at column 0.
const startRe = /^<(emu-(?:intro|clause|annex))\b([^>]*)>$/gm;
const starts = [];
let m;
while ((m = startRe.exec(src)) !== null) {
  starts.push({ tag: m[1], attrs: m[2], offset: m.index });
}
if (starts.length === 0) throw new Error("No top-level chapters found");

const bodyClose = src.lastIndexOf("</body>");
const tailEnd = bodyClose >= 0 ? bodyClose : src.length;

const chapters = [];
for (let i = 0; i < starts.length; i++) {
  const s = starts[i];
  const e = i + 1 < starts.length ? starts[i + 1].offset : tailEnd;
  const block = src.slice(s.offset, e).trimEnd();
  const open = block.match(/^<emu-(?:intro|clause|annex)\b[^>]*>/);
  const close = block.match(/<\/emu-(?:intro|clause|annex)>\s*$/);
  if (!open || !close) {
    throw new Error(
      `Chapter ${i} (${s.tag}) missing open/close at offset ${s.offset}`,
    );
  }
  let inner = block.slice(open[0].length, block.length - close[0].length)
    .trim();
  const idMatch = s.attrs.match(/\bid="([^"]+)"/);
  const id = idMatch ? idMatch[1] : `chapter-${i}`;
  const titleMatch = inner.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const titleHtml = titleMatch ? titleMatch[1] : id;
  const title = titleHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() ||
    id;
  // Strip the leading h1 since we render the title separately as a markdown heading.
  if (titleMatch) {
    inner = inner.slice(0, titleMatch.index) +
      inner.slice(titleMatch.index + titleMatch[0].length);
    inner = inner.replace(/^\s+/, "");
  }
  // `back-matter` annexes (Bibliography, Colophon) are unlettered in ecmarkup.
  // Annexes are informative by default; a `normative` attribute marks the
  // exceptions (e.g. Annex B, web-compat features).
  const backMatter = /\bback-matter\b/.test(s.attrs);
  const normative = /\bnormative\b/.test(s.attrs);
  chapters.push({ id, title, inner, kind: s.tag, backMatter, normative });
}

// Locate the first nested section opener (<emu-clause or <emu-annex) at or
// after `from`. Returns { idx, tag } or null. Skips matches that are inside
// attribute values by requiring the next char to terminate the tag name.
function findNextSection(html, from) {
  let i = from;
  while (i < html.length) {
    const a = html.indexOf("<emu-clause", i);
    const b = html.indexOf("<emu-annex", i);
    const idx = a === -1 ? b : b === -1 ? a : Math.min(a, b);
    if (idx === -1) return null;
    const tag = (a !== -1 && idx === a) ? "emu-clause" : "emu-annex";
    const next = html.charCodeAt(idx + 1 + tag.length);
    // Valid tag boundary: whitespace or '>'
    if (
      next === 0x20 || next === 0x09 || next === 0x0A || next === 0x0D ||
      next === 0x3E
    ) {
      return { idx, tag };
    }
    i = idx + 1;
  }
  return null;
}

// ── ecmarkup "structured header" transform ──────────────────────────────────
// Clauses whose <h1> holds a typed signature (e.g. "Foo ( _x_: a Number ): a
// Boolean") immediately followed by <dl class="header"> are processed by
// ecmarkup at build time: the return type is stripped from the heading and a
// descriptive preamble paragraph ("The abstract operation Foo takes argument
// _x_ (a Number) and returns a Boolean. It performs the following steps when
// called:") is synthesised from the signature plus the dl entries (for /
// description). Upstream we inject the raw ecmarkup *source*, which skips this
// pass, so we replicate it here. Port of ecmarkup src/header-parser.ts
// (parseHeader / formatHeader / formatPreamble) and src/Clause.ts.

function formatEnglishList(list, conjunction = "and") {
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} ${conjunction} ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, ${conjunction} ${
    list[list.length - 1]
  }`;
}

// Parse the raw <h1> inner source into { prefix, name, params, optionalParams,
// returnType }, or null if it doesn't look like a signature. Faithful subset of
// ecmarkup's parseHeader (no ins/del/mark diff wrappers — absent in releases).
function parseStructuredH1(source) {
  let text = source.replace(/^\s*/, "");
  let prefix = null;
  let m;
  if ((m = text.match(/^(Static|Runtime) Semantics:\s*/i))) {
    prefix = m[0].trimEnd();
    text = text.slice(m[0].length);
  }
  if (!(m = text.match(/^[^(\s]+\s*/))) return null;
  const name = m[0].trimEnd();
  text = text.slice(m[0].length);
  const params = [];
  const optionalParams = [];
  if (text === "") {
    return { prefix, name, params, optionalParams, returnType: null };
  }
  // ecmarkup eats `( ` with literal spaces only, so a newline after `(` flags
  // the multi-line (typed) parameter form.
  if (!(m = text.match(/^\([ \t]*/))) return null;
  text = text.slice(m[0].length);
  if (text[0] === "\n") {
    text = text.replace(/^\s*/, "");
    while (true) {
      if ((m = text.match(/^\)\s*/))) {
        text = text.slice(m[0].length);
        break;
      }
      let optional = false;
      if ((m = text.match(/^optional\s*/i))) {
        optional = true;
        text = text.slice(m[0].length);
      }
      if (!(m = text.match(/^[A-Za-z0-9_]+[ \t]*/))) return null;
      const pname = m[0].trimEnd();
      text = text.slice(m[0].length);
      if (!(m = text.match(/^:+[ \t]*/))) return null;
      text = text.slice(m[0].length);
      if (!(m = text.match(/^[^\n]+\n\s*/))) return null;
      let ptype = m[0].trimEnd();
      text = text.slice(m[0].length);
      if (ptype.endsWith(",")) ptype = ptype.slice(0, -1);
      (optional ? optionalParams : params).push({
        name: pname,
        type: ptype === "unknown" ? null : ptype,
      });
    }
  } else {
    let optional = false;
    while (true) {
      if ((m = text.match(/^\)\s*/))) {
        text = text.slice(m[0].length);
        break;
      }
      if ((m = text.match(/^\[(\s*,)?\s*/))) {
        optional = true;
        text = text.slice(m[0].length);
      }
      if (!(m = text.match(/^[A-Za-z0-9_]+\s*/))) return null;
      const pname = m[0].trimEnd();
      text = text.slice(m[0].length);
      (optional ? optionalParams : params).push({ name: pname, type: null });
      if ((m = text.match(/^((\s*\])+|,)\s*/))) text = text.slice(m[0].length);
    }
  }
  let returnType = null;
  if ((m = text.match(/^:[ \t]*/))) {
    text = text.slice(m[0].length);
    const r = text.match(/^.*/);
    if (r) {
      returnType = r[0].trim() || null;
      if (returnType === "unknown") returnType = null;
    }
  }
  return { prefix, name, params, optionalParams, returnType };
}

// "( a, b [ , c ] )" — param names verbatim (still carry ecmarkup shorthand
// like _x_, expanded to <var> downstream). Mirrors printSimpleParamList.
function formatSimpleParamList(params, optionalParams) {
  let result = "(" + params.map((p) => " " + p.name).join(",");
  if (optionalParams.length > 0) {
    result += optionalParams
      .map((p, i) => " [ " + (i > 0 || params.length > 0 ? ", " : "") + p.name)
      .join("");
    result += optionalParams.map(() => " ]").join("");
  }
  result += " )";
  return result;
}

// "no arguments" | "argument x (a Number)" | "arguments a (T) and b (U)" | …
function formatParamsClause(params, optionalParams) {
  const withType = (p) => (p.type != null ? `${p.name} (${p.type})` : p.name);
  if (params.length === 0 && optionalParams.length === 0) return "no arguments";
  let s = "";
  if (params.length > 0) {
    s += (params.length === 1 ? "argument" : "arguments") + " " +
      formatEnglishList(params.map(withType));
    if (optionalParams.length > 0) s += " and ";
  }
  if (optionalParams.length > 0) {
    s += "optional " +
      (optionalParams.length === 1 ? "argument" : "arguments") + " " +
      formatEnglishList(optionalParams.map(withType));
  }
  return s;
}

// The cleaned heading text: prefix + name + param list, with the return type
// dropped. `type="sdo"` headings drop the parameter list entirely.
function formatHeaderTitle(parsed, type) {
  let h = (parsed.prefix ? parsed.prefix + " " : "") + parsed.name + " " +
    formatSimpleParamList(parsed.params, parsed.optionalParams);
  if (type === "sdo" && h.includes("(")) {
    h = (h.substring(0, h.indexOf("(")) + h.substring(h.lastIndexOf(")") + 1))
      .trim();
  }
  return h;
}

// Pull <dt>/<dd> pairs out of the structured header <dl>. Only `for` and
// `description` feed the preamble; effects / skip-checks are dropped.
function parseHeaderDl(dlInner) {
  const out = { for: null, description: null };
  const re = /<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi;
  let m;
  while ((m = re.exec(dlInner)) !== null) {
    const label = m[1].replace(/<[^>]+>/g, "").trim().toLowerCase();
    const value = m[2].trim();
    if (label === "for" && out.for === null) out.for = value;
    else if (label === "description" && out.description === null) {
      out.description = value;
    }
  }
  return out;
}

// Build the section body that replaces the structured header: the synthesised
// preamble paragraph(s) followed by `rest` (the original content after the dl).
// Mirrors formatPreamble, including where the trailing "It performs the
// following steps…" sentence lands (inline vs its own <p> before the algorithm).
function buildStructuredBody(clauseType, parsed, dlEntries, rest) {
  const type = (clauseType || "").toLowerCase();
  const name = parsed.name;
  const formattedParams = formatParamsClause(
    parsed.params,
    parsed.optionalParams,
  );
  let main;
  switch (type) {
    case "numeric method":
    case "abstract operation":
      main = `The abstract operation ${name}`;
      break;
    case "host-defined abstract operation":
      main = `The host-defined abstract operation ${name}`;
      break;
    case "implementation-defined abstract operation":
      main = `The implementation-defined abstract operation ${name}`;
      break;
    case "sdo":
    case "syntax-directed operation":
      main = `The syntax-directed operation ${name}`;
      break;
    case "internal method":
    case "concrete method":
      main = `The ${name} ${type} of ${dlEntries.for ?? ""}`;
      break;
    default:
      main = name;
  }
  main += ` takes ${formattedParams}`;
  if (parsed.returnType != null) main += ` and returns ${parsed.returnType}`;
  main += ".";

  const blockParas = [];
  if (dlEntries.description != null) {
    if (
      /^<(p|ul|ol|emu-alg|emu-note|figure|emu-table|dl|div)[\s>]/i.test(
        dlEntries.description,
      )
    ) {
      blockParas.push(dlEntries.description);
    } else {
      main += " " + dlEntries.description;
    }
  }

  const isSdo = type === "sdo" || type === "syntax-directed operation";
  const lastSentence = isSdo
    ? "It is defined piecewise over the following productions:"
    : "It performs the following steps when called:";
  const targetTag = isSdo ? "<emu-grammar" : "<emu-alg";
  // The algorithm/grammar must belong to THIS clause (appear before any nested
  // sub-clause), else there's nothing to attach the trailing sentence to.
  const sub = findNextSection(rest, 0);
  const subIdx = sub ? sub.idx : rest.length;
  const tIdx = rest.indexOf(targetTag);
  if (tIdx >= 0 && tIdx < subIdx) {
    const notesPresent = /<emu-note\b/.test(rest.slice(0, tIdx));
    if (blockParas.length > 0 || notesPresent) {
      const newRest = rest.slice(0, tIdx) + `<p>${lastSentence}</p>\n` +
        rest.slice(tIdx);
      return `<p>${main}</p>` + blockParas.join("") + newRest;
    }
    main += " " + lastSentence;
    return `<p>${main}</p>` + rest;
  }
  return `<p>${main}</p>` + blockParas.join("") + rest;
}

// Recursively split inner HTML into a tree of nested <emu-clause>/<emu-annex>
// subsections. Returns { pre, children: [{ id, title, tree }] } where `pre`
// is the HTML before the first nested section.
function parseTree(html) {
  const children = [];
  let pre = "";
  let i = 0;
  while (i < html.length) {
    const found = findNextSection(html, i);
    if (!found) {
      const rest = html.slice(i);
      if (children.length === 0) pre += rest;
      else if (rest.trim() !== "") {
        children[children.length - 1].tree.pre += rest;
      }
      break;
    }
    const { idx: openIdx, tag } = found;
    const openClose = `</${tag}>`;
    const openEnd = html.indexOf(">", openIdx);
    if (openEnd === -1) throw new Error(`Malformed <${tag}>`);
    const openTag = html.slice(openIdx, openEnd + 1);
    let depth = 1;
    let j = openEnd + 1;
    let innerEnd = -1;
    while (depth > 0) {
      const nextOpenInfo = findNextSection(html, j);
      const nextClose = html.indexOf(openClose, j);
      if (nextClose === -1) throw new Error(`Unclosed <${tag}>`);
      const sameTagOpen = nextOpenInfo && nextOpenInfo.tag === tag
        ? nextOpenInfo.idx
        : -1;
      if (sameTagOpen !== -1 && sameTagOpen < nextClose) {
        depth++;
        j = sameTagOpen + tag.length + 1;
      } else {
        depth--;
        if (depth === 0) {
          innerEnd = nextClose;
          j = nextClose + openClose.length;
          break;
        }
        j = nextClose + openClose.length;
      }
    }
    const innerStart = openEnd + 1;
    const innerHtml = html.slice(innerStart, innerEnd);
    const attrs = openTag.slice(tag.length + 1, -1);
    const idMatch = attrs.match(/\bid="([^"]+)"/);
    const id = idMatch ? idMatch[1] : "";
    const typeMatch = attrs.match(/\btype="([^"]+)"/);
    const clauseType = typeMatch ? typeMatch[1] : null;
    const titleMatch = innerHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const titleHtml = titleMatch ? titleMatch[1] : id;
    let title;
    let innerStripped;
    // Structured header: <h1> signature immediately followed by <dl class="header">.
    const afterH1 = titleMatch
      ? innerHtml.slice(titleMatch.index + titleMatch[0].length)
      : "";
    const dlMatch = titleMatch &&
      afterH1.match(/^\s*<dl class="header">([\s\S]*?)<\/dl>/);
    const parsedHeader = dlMatch ? parseStructuredH1(titleHtml) : null;
    if (dlMatch && parsedHeader && parsedHeader.name) {
      title = formatHeaderTitle(parsedHeader, clauseType);
      const rest = afterH1.slice(dlMatch[0].length);
      innerStripped = buildStructuredBody(
        clauseType,
        parsedHeader,
        parseHeaderDl(dlMatch[1]),
        rest,
      )
        .replace(/^\s+/, "");
    } else {
      title = titleHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      innerStripped = titleMatch
        ? (innerHtml.slice(0, titleMatch.index) + afterH1).replace(/^\s+/, "")
        : innerHtml;
    }
    const preText = html.slice(i, openIdx);
    if (children.length === 0) pre += preText;
    else if (preText.trim() !== "") {
      children[children.length - 1].tree.pre += preText;
    }
    children.push({ id, title, tree: parseTree(innerStripped) });
    i = j;
  }
  return { pre, children };
}

// Walk the tree and collect [secPath, html] entries.
function flattenTree(tree, prefix = "") {
  const sections = [[prefix, tree.pre]];
  tree.children.forEach((child, idx) => {
    const newPrefix = prefix === "" ? String(idx + 1) : `${prefix}.${idx + 1}`;
    sections.push(...flattenTree(child.tree, newPrefix));
  });
  return sections;
}

// A=0, B=1, ..., Z=25, AA=26, AB=27, ...
function annexLabel(n) {
  let s = "";
  let x = n;
  while (true) {
    s = String.fromCharCode(65 + (x % 26)) + s;
    x = Math.floor(x / 26) - 1;
    if (x < 0) break;
  }
  return s;
}

// Decode the named HTML entities that ecmarkup actually uses in headings —
// enough for the spec's "&lt;&lt;", "&infin;", "&ldquo;" etc. without pulling
// in a full HTML entity table. Numeric refs (&#123; / &#xAB;) covered too.
function decodeEntities(s) {
  return s
    .replace(
      /&#x([0-9a-fA-F]+);/g,
      (_, n) => String.fromCodePoint(parseInt(n, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&infin;/g, "∞")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&amp;/g, "&"); // must be last so we don't double-decode
}

// Emit MDX lines: <Sec id=... /> for the current node, then heading + recurse for each child.
function renderMdxTree(tree, chapterPrefix, secPath, depth) {
  const lines = [];
  if (tree.pre.trim() !== "") {
    lines.push(`<Sec id=${JSON.stringify(secPath)} />`);
    lines.push("");
  }
  tree.children.forEach((child, idx) => {
    const childSecPath = secPath === ""
      ? String(idx + 1)
      : `${secPath}.${idx + 1}`;
    const childNum = chapterPrefix === ""
      ? childSecPath
      : `${chapterPrefix}.${childSecPath}`;
    const hashes = "#".repeat(Math.min(depth, 6));
    // Inline anchor before the heading text so #<spec-id> resolves to the
    // start of the heading after navigation. Use <span>, not <a>: Nextra's
    // TOC wraps each heading's content in its own <a href="#…">, and a
    // nested <a> inside that is invalid HTML. Any element with `id` works
    // as a fragment target.
    const anchor = child.id ? `<span id="${child.id}" /> ` : "";
    // Run inline ecmarkup markup on the heading text too (it's stripped to
    // plain text earlier but still contains `_x_`, `*foo*`, ~enum~, etc.),
    // and let MDX parse the resulting <var>/<b>/<emu-…> tags inline.
    lines.push(
      `${hashes} ${anchor}${childNum} ${transformInlineText(child.title)}`,
    );
    lines.push("");
    lines.push(
      ...renderMdxTree(child.tree, chapterPrefix, childSecPath, depth + 1),
    );
  });
  return lines;
}

// Walk a tree and register every nested clause id → {number, slug} so we can
// resolve <emu-xref href="#id"> back to its rendered section number ("14.7.2").
function registerSectionIds(tree, chapPrefix, chapSlug, into) {
  tree.children.forEach((child, idx) => {
    const childPrefix = chapPrefix === ""
      ? String(idx + 1)
      : `${chapPrefix}.${idx + 1}`;
    if (child.id) into.set(child.id, { number: childPrefix, slug: chapSlug });
    registerSectionIds(child.tree, childPrefix, chapSlug, into);
  });
}

// Pass 1: build chapter trees and a global id → section map, so cross-chapter
// xrefs can be resolved before any file is written.
let clauseIdx = 0;
let annexIdx = 0;
const idToSection = new Map();
const built = chapters.map((c) => {
  const slug = c.id.replace(/^sec-/, "");
  const pageSlug = c.kind === "emu-intro" ? "index" : slug;
  let chapterNum = "";
  if (c.kind === "emu-clause") {
    clauseIdx++;
    chapterNum = String(clauseIdx);
  } else if (c.kind === "emu-annex") {
    // back-matter annexes stay unnumbered (and don't consume a letter).
    chapterNum = c.backMatter ? "" : annexLabel(annexIdx++);
  }
  const tree = parseTree(c.inner);
  idToSection.set(c.id, { number: chapterNum, slug: pageSlug });
  registerSectionIds(tree, chapterNum, pageSlug, idToSection);
  return { ...c, slug, pageSlug, chapterNum, tree };
});

// Number every <emu-table>/<emu-figure> in document order (global counters,
// like ecmarkup) so empty <emu-xref> to them resolve to "Table N"/"Figure N"
// links and their captions can show the number. `idToLabel` is the non-clause
// xref resolver (id → { text, slug }); tableNum/figureNum drive the caption
// CSS via a data-num attribute. oldids are registered too so legacy anchors
// still resolve to text.
const idToLabel = new Map();
const tableNum = new Map();
const figureNum = new Map();
{
  let tN = 0;
  let fN = 0;
  const re = /<emu-(table|figure)\b([^>]*)>/g;
  for (const c of built) {
    let mm;
    while ((mm = re.exec(c.inner)) !== null) {
      // Count every float (even id-less ones) so numbers stay in document order
      // and later tables don't shift relative to ecmarkup.
      const isTable = mm[1] === "table";
      const n = isTable ? ++tN : ++fN;
      const idm = mm[2].match(/\bid="([^"]+)"/);
      if (!idm) continue;
      const id = idm[1];
      (isTable ? tableNum : figureNum).set(id, String(n));
      const entry = {
        text: `${isTable ? "Table" : "Figure"} ${n}`,
        slug: c.pageSlug,
      };
      idToLabel.set(id, entry);
      const oldids = mm[2].match(/\boldids="([^"]+)"/);
      if (oldids) {
        for (
          const o of oldids[1].split(",").map((s) => s.trim()).filter(Boolean)
        ) {
          idToLabel.set(o, entry);
        }
      }
    }
    re.lastIndex = 0;
  }
}

// Add data-num="N" to <emu-table>/<emu-figure> so the caption CSS can render
// "Table N: <caption>" / "Figure N: <caption>".
function applyFloatNum(html) {
  return html.replace(/<emu-(table|figure)\b([^>]*)>/g, (full, kind, attrs) => {
    const idm = attrs.match(/\bid="([^"]+)"/);
    if (!idm) return full;
    const num = (kind === "table" ? tableNum : figureNum).get(idm[1]);
    return num ? `<emu-${kind}${attrs} data-num="${num}">` : full;
  });
}

// Notes are labelled "Note" when a clause has one, "Note 1"/"Note 2"/… when it
// has several (ecmarkup numbers them per clause). Each <Sec> chunk is one
// clause body, so we number per chunk: expose the index via data-num for the
// label CSS, and collect note ids for xref resolution.
function numberNotes(html) {
  const found = [];
  const tags = html.match(/<emu-note\b[^>]*>/g) ?? [];
  if (tags.length < 2) {
    for (const tag of tags) {
      const idm = tag.match(/\bid="([^"]+)"/);
      if (idm) found.push({ id: idm[1], label: "Note" });
    }
    return { html, found };
  }
  let i = 0;
  const out = html.replace(/<emu-note\b([^>]*)>/g, (full, attrs) => {
    i++;
    const idm = attrs.match(/\bid="([^"]+)"/);
    if (idm) found.push({ id: idm[1], label: `Note ${i}` });
    return `<emu-note${attrs} data-num="${i}">`;
  });
  return { html: out, found };
}
const applyNoteNum = (html) => numberNotes(html).html;

// Pre-pass: register note ids → label/slug so cross-references resolve (must
// run before any applyXrefSubst).
for (const c of built) {
  for (const [, html] of flattenTree(c.tree)) {
    for (const { id, label } of numberNotes(html).found) {
      idToLabel.set(id, { text: label, slug: c.pageSlug });
    }
  }
}

// Pre-pass: register step ids → dotted ordinal label ("1.d") / slug so
// <emu-xref> to algorithm steps resolve to the step number.
for (const c of built) {
  const algRe = /<emu-alg([^>]*?)>([\s\S]*?)<\/emu-alg>/g;
  let am;
  while ((am = algRe.exec(c.inner)) !== null) {
    const root = buildAlgTree(am[2]);
    if (root) collectAlgSteps(root.children, 0, "", c.pageSlug, idToLabel);
  }
}

// emu-intro lives at <basePath>/, all other chapters at <basePath>/<slug>.
// Helper used by xref substitution so links survive routing under any
// basePath (empty for local dev, '/ecma262/draft' / '/ecma262/es2025' / … in
// production).
function pathFor(slug) {
  const local = slug === "index" ? "" : `/${slug}`;
  return `${BASE_PATH}${local}`;
}

// <emu-xref href="#id"> is ecmarkup's cross-reference tag. Two source forms:
//   <emu-xref href="#id"></emu-xref>       — empty, ecmarkup injects "14.7.2"
//   <emu-xref href="#id">link text</emu-xref> — author-supplied text
// We rewrite both to <a href="/<slug>#<id>">…</a>. Anchors `id="<id>"` are
// emitted on chapter/section headings in MDX (see renderMdxTree below) so
// the targets exist.
function applyXrefSubst(html) {
  html = html.replace(/<emu-xref([^>]*?)>\s*<\/emu-xref>/g, (full, attrs) => {
    const m = attrs.match(/\bhref="#([^"]+)"/);
    if (!m) return full;
    const id = m[1];
    const s = idToSection.get(id);
    if (s) return `<a href="${pathFor(s.slug)}#${id}">${s.number}</a>`;
    const l = idToLabel.get(id);
    if (l) return `<a href="${pathFor(l.slug)}#${id}">${l.text}</a>`;
    return id;
  });
  html = html.replace(
    /<emu-xref([^>]*?)>([\s\S]+?)<\/emu-xref>/g,
    (full, attrs, inner) => {
      const m = attrs.match(/\bhref="#([^"]+)"/);
      if (!m) return full;
      const id = m[1];
      const s = idToSection.get(id) ?? idToLabel.get(id);
      if (!s) return inner;
      return `<a href="${pathFor(s.slug)}#${id}">${inner}</a>`;
    },
  );
  return html;
}

// Build a map of nonterminal LHS → rendered production HTML by scanning every
// canonical <emu-grammar type="definition"> block (excluding `example` ones,
// which are illustrative snippets in the notational-conventions chapter, not
// the real grammar). Each block may pack multiple productions separated by
// blank lines; split them so a prodref resolves to just its own production.
const grammarDefs = new Map();
{
  const grammarRe = /<emu-grammar([^>]*?)>([\s\S]*?)<\/emu-grammar>/g;
  let gm;
  while ((gm = grammarRe.exec(src)) !== null) {
    const attrs = gm[1];
    if (!/\btype="definition"/.test(attrs)) continue;
    if (/\bexample\b/.test(attrs)) continue;
    const inner = gm[2];
    // Split into productions on blank lines; trim each chunk of surrounding
    // blank lines while preserving the indentation of content lines.
    const chunks = inner.split(/\n[ \t]*\n/);
    for (const raw of chunks) {
      // Drop leading comment lines (ecmarkup-format pragmas like
      // "// emu-format ignore") that sit between blank-line separators and
      // the actual LHS, so we don't misread them as the production head.
      const chunk = raw
        .replace(/^(?:[ \t]*\n|[ \t]*\/\/[^\n]*\n)+/, "")
        .replace(/\n+[ \t]*$/, "");
      if (!chunk.trim()) continue;
      const firstLine = chunk.split("\n")[0];
      const lhsMatch = firstLine.match(
        /^\s*([A-Za-z][A-Za-z0-9_]*)(?:\s*\[[^\]]*\])?\s*::*/,
      );
      if (!lhsMatch) continue;
      const lhs = lhsMatch[1];
      const lines = chunk.split("\n");
      const indents = lines.filter((l) => l.trim() !== "").map((l) =>
        l.match(/^[ \t]*/)[0].length
      );
      const minIndent = indents.length ? Math.min(...indents) : 0;
      const dedented = lines.map((l) => l.slice(minIndent)).join("\n");
      // Longest production wins when multiple definitions exist (the canonical
      // one tends to list more alternatives).
      const existing = grammarDefs.get(lhs);
      if (!existing || dedented.length > existing.length) {
        grammarDefs.set(lhs, dedented);
      }
    }
  }
}

// Replace empty <emu-prodref name="X"></emu-prodref> with its production text
// wrapped in <pre> so line breaks and indentation survive raw-HTML embedding.
function applyProdrefSubst(html) {
  return html.replace(
    /<emu-prodref([^>]*?)>\s*<\/emu-prodref>/g,
    (full, attrs) => {
      const m = attrs.match(/\bname="([^"]+)"/);
      if (!m) return full;
      const def = grammarDefs.get(m[1]);
      if (def === undefined) return full;
      return `<emu-grammar type="definition">${
        tokenizeGrammarBlock(def)
      }</emu-grammar>`;
    },
  );
}

// Strip a common leading indent from every non-blank line in `text`.
function dedent(text) {
  const lines = text.split("\n");
  const indents = lines.filter((l) => l.trim() !== "").map((l) =>
    l.match(/^[ \t]*/)[0].length
  );
  const minIndent = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(minIndent)).join("\n");
}

// Parse <emu-alg> body (Markdown-style "1." numbered + "*" bulleted lists
// with 2-space indent per nesting level) into real nested <ol>/<ul> HTML, so
// the browser renders proper hierarchical step numbering.
// Parse the <emu-alg> body into a tree of { type:'ol'|'ul', text, id, children }
// items. `id` captures a leading [id="step-…"] annotation (used for the <li>
// anchor and step numbering); all leading [..] annotations are stripped from
// the displayed text.
function buildAlgTree(inner) {
  const lines = inner.split("\n");
  // The first bullet line establishes baseline indent (level 0).
  let baseIndent = -1;
  for (const l of lines) {
    const t = l.trimStart();
    if (/^1\.\s/.test(t) || /^\*\s/.test(t)) {
      baseIndent = l.length - t.length;
      break;
    }
  }
  if (baseIndent === -1) return null;

  const items = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    const t = l.trimStart();
    const olM = /^1\.\s+(.*)$/.exec(t);
    const ulM = /^\*\s+(.*)$/.exec(t);
    if (!olM && !ulM) {
      i++;
      continue;
    }
    const indent = l.length - t.length;
    const depth = Math.max(0, Math.floor((indent - baseIndent) / 2));
    const type = olM ? "ol" : "ul";
    const raw = olM ? olM[1] : ulM[1];
    const ann = raw.match(/^(?:\[[^\]]+\]\s*)+/);
    const idm = ann && ann[0].match(/\bid="(step-[^"]+)"/);
    const id = idm ? idm[1] : null;
    let text = raw.replace(/^(?:\[[^\]]+\]\s*)+/, "");
    // Continuation lines: any non-bullet line at deeper indent belongs to this
    // item (commonly embedded <figure>/<table> blocks).
    let j = i + 1;
    while (j < lines.length) {
      const nt = lines[j].trimStart();
      if (nt === "") {
        text += "\n";
        j++;
        continue;
      }
      const nIndent = lines[j].length - nt.length;
      if (nIndent <= indent) break;
      if (/^1\.\s/.test(nt) || /^\*\s/.test(nt)) break;
      text += "\n" + lines[j];
      j++;
    }
    items.push({ depth, type, id, text: text.replace(/\s+$/, "") });
    i = j;
  }
  if (!items.length) return null;

  // Build a tree: stack[d] is the parent node at depth d.
  const root = { children: [] };
  const stack = [root];
  for (const it of items) {
    while (stack.length > it.depth + 1) stack.pop();
    while (stack.length < it.depth + 1) {
      const parent = stack[stack.length - 1];
      if (!parent.children.length) {
        parent.children.push({
          type: it.type,
          text: "",
          id: null,
          children: [],
        });
      }
      stack.push(parent.children[parent.children.length - 1]);
    }
    stack[stack.length - 1].children.push({
      type: it.type,
      text: it.text,
      id: it.id,
      children: [],
    });
  }
  return root;
}

function parseAlg(inner) {
  const root = buildAlgTree(inner);
  if (!root) return null;
  // Serialize: group consecutive same-type siblings into a single <ol>/<ul>.
  // A step's [id] becomes the <li> anchor so #step-… links resolve.
  function serialize(nodes) {
    let html = "";
    let k = 0;
    while (k < nodes.length) {
      const t = nodes[k].type;
      const group = [];
      while (k < nodes.length && nodes[k].type === t) {
        group.push(nodes[k]);
        k++;
      }
      html += `<${t}>` + group.map((n) =>
        `<li${n.id ? ` id="${n.id}"` : ""}>${n.text}${
          serialize(n.children)
        }</li>`
      ).join("") + `</${t}>`;
    }
    return html;
  }
  return serialize(root.children);
}

// Step ordinals match the CSS list-style cycle: <ol> levels go decimal,
// lower-alpha, lower-roman, repeating.
function alphaLabel(n) {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}
function romanLabel(n) {
  const map = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [
      90,
      "xc",
    ],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let s = "";
  for (const [v, sym] of map) {
    while (n >= v) {
      s += sym;
      n -= v;
    }
  }
  return s;
}
function stepOrdinal(n, olLevel) {
  const k = (olLevel - 1) % 3;
  return k === 0 ? String(n) : k === 1 ? alphaLabel(n) : romanLabel(n);
}

// Walk an alg tree, registering step id → dotted ordinal label ("1.d") for
// xref resolution. `olAncestors` is the number of <ol> levels above `nodes`.
function collectAlgSteps(nodes, olAncestors, prefix, slug, out) {
  let olIdx = 0;
  for (const n of nodes) {
    let childPrefix = prefix;
    let childOl = olAncestors;
    if (n.type === "ol") {
      olIdx++;
      const label = stepOrdinal(olIdx, olAncestors + 1);
      childPrefix = prefix ? `${prefix}.${label}` : label;
      childOl = olAncestors + 1;
      if (n.id) out.set(n.id, { text: childPrefix, slug });
    } else if (n.id) {
      out.set(n.id, { text: prefix, slug });
    }
    collectAlgSteps(n.children, childOl, childPrefix, slug, out);
  }
}

function applyAlgSubst(html) {
  return html.replace(
    /<emu-alg([^>]*?)>([\s\S]*?)<\/emu-alg>/g,
    (full, attrs, inner) => {
      const list = parseAlg(inner);
      if (list === null) return full;
      return `<emu-alg${attrs}>${list}</emu-alg>`;
    },
  );
}

// Tokenize one grammar source line into wrapped HTML elements. `isLhs` flags
// the first non-blank line of a production so its leading nonterminal gets the
// ".lhs" class for bolding.
//   • // ...           → <span class="cm">…</span>           (ecmarkup pragma)
//   • &gt; rest of line → <emu-gprose>…</emu-gprose>          (prose description)
//   • `foo`            → <emu-t>foo</emu-t>                  (terminal)
//   • [Yield, ?Await]  → <emu-mods><emu-params>[…]</emu-params></emu-mods>
//   • :, ::, :::, :::: → <emu-geq>…</emu-geq>                (production arrow)
//   • [A-Z]\w*         → <emu-nt>…</emu-nt>                  (nonterminal)
//   • ? * +            → <emu-mods><emu-opt>…</emu-opt></emu-mods>
//   • "one of"         → <emu-oneof>one of</emu-oneof>
// Trailing modifiers ([params] and ?/*/+) that sit flush against an <emu-nt>
// (no intervening whitespace) get nested inside it as <emu-mods> children,
// matching tc39.es/ecma262's serialization.
function tokenizeGrammarLine(line, isLhs) {
  if (!line.trim()) return line;
  if (/^\s*\/\//.test(line)) return `<span class="cm">${line}</span>`;
  const descM = line.match(/^([ \t]*)(&gt;\s.*)$/);
  if (descM) return `${descM[1]}<emu-gprose>${descM[2]}</emu-gprose>`;

  let out = "";
  let i = 0;
  let lhsClaimed = !isLhs;
  while (i < line.length) {
    const ch = line[i];
    if (ch === " " || ch === "\t") {
      out += ch;
      i++;
      continue;
    }
    if (ch === "`") {
      const end = line.indexOf("`", i + 1);
      if (end === -1) {
        out += ch;
        i++;
        continue;
      }
      out += `<emu-t>${line.slice(i + 1, end)}</emu-t>`;
      i = end + 1;
      continue;
    }
    if (ch === "[") {
      const end = line.indexOf("]", i + 1);
      if (end === -1) {
        out += ch;
        i++;
        continue;
      }
      // Free-standing parameter/constraint list (no preceding NT). Still wrap
      // in <emu-mods> so CSS selectors match tc39's structure.
      out += `<emu-mods><emu-params>[${
        line.slice(i + 1, end)
      }]</emu-params></emu-mods>`;
      i = end + 1;
      continue;
    }
    if (ch === ":") {
      let j = i;
      while (j < line.length && line[j] === ":") j++;
      out += `<emu-geq>${line.slice(i, j)}</emu-geq>`;
      i = j;
      continue;
    }
    if (/[A-Z]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      const ntName = line.slice(i, j);
      // Look ahead for modifiers flush against the NT (no whitespace gap):
      // [params] and/or ? * +. Multiple may chain (e.g. `Foo[+In]?`).
      let mods = "";
      while (j < line.length) {
        const c2 = line[j];
        if (c2 === "?" || c2 === "*" || c2 === "+") {
          mods += `<emu-opt>${c2}</emu-opt>`;
          j++;
        } else if (c2 === "[") {
          const end = line.indexOf("]", j + 1);
          if (end === -1) break;
          mods += `<emu-params>[${line.slice(j + 1, end)}]</emu-params>`;
          j = end + 1;
        } else {
          break;
        }
      }
      const inner = mods ? `${ntName}<emu-mods>${mods}</emu-mods>` : ntName;
      const cls = lhsClaimed ? "" : ' class="lhs"';
      out += `<emu-nt${cls}>${inner}</emu-nt>`;
      lhsClaimed = true;
      i = j;
      continue;
    }
    if (ch === "?" || ch === "*" || ch === "+") {
      out += `<emu-mods><emu-opt>${ch}</emu-opt></emu-mods>`;
      i++;
      continue;
    }
    if (
      line.slice(i, i + 6) === "one of" &&
      (i + 6 === line.length || !/[A-Za-z0-9_]/.test(line[i + 6]))
    ) {
      out += "<emu-oneof>one of</emu-oneof>";
      i += 6;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

// Wrap one production chunk (a blank-line-delimited slice of the grammar
// body) in <emu-production>: the first line carries LHS + geq + an optional
// inline first RHS or trailing "one of"; each subsequent non-comment line is
// its own <emu-rhs>. Indentation/newlines are preserved as raw whitespace
// so the block keeps its visual shape when display-rendered with line breaks.
function tokenizeGrammarProduction(chunk) {
  const lines = chunk.split("\n");
  let body = "";
  let isFirst = true;
  for (const line of lines) {
    if (!line.trim()) {
      body += "\n";
      continue;
    }
    if (isFirst) {
      const tokenized = tokenizeGrammarLine(line, true);
      // Split the tokenized first line at the </emu-geq> closing tag so
      // anything after it can be wrapped in <emu-rhs> (or stand alone if it's
      // an <emu-oneof>).
      const geqClose = "</emu-geq>";
      const cut = tokenized.indexOf(geqClose);
      if (cut === -1) {
        body += tokenized;
      } else {
        const head = tokenized.slice(0, cut + geqClose.length);
        let tail = tokenized.slice(cut + geqClose.length);
        const tailWs = tail.match(/^\s*/)[0];
        tail = tail.slice(tailWs.length);
        body += head + tailWs;
        if (tail.startsWith("<emu-oneof>")) {
          const oneofClose = "</emu-oneof>";
          const oc = tail.indexOf(oneofClose);
          if (oc !== -1) {
            const oneofChunk = tail.slice(0, oc + oneofClose.length);
            let rest = tail.slice(oc + oneofClose.length);
            const restWs = rest.match(/^\s*/)[0];
            rest = rest.slice(restWs.length);
            body += oneofChunk + restWs;
            if (rest) body += `<emu-rhs>${rest}</emu-rhs>`;
          } else {
            body += tail;
          }
        } else if (tail) {
          body += `<emu-rhs>${tail}</emu-rhs>`;
        }
      }
      isFirst = false;
    } else if (/^\s*\/\//.test(line)) {
      // Preserve in-grammar comments as a span; not a separate RHS.
      body += `<span class="cm">${line}</span>`;
    } else {
      const leadingWs = line.match(/^\s*/)[0];
      const rest = line.slice(leadingWs.length);
      body += leadingWs +
        `<emu-rhs>${tokenizeGrammarLine(rest, false)}</emu-rhs>`;
    }
  }
  return `<emu-production>${body}</emu-production>`;
}

// Tokenize a grammar block (one or more productions, blank-line separated).
// Each non-empty chunk is wrapped in <emu-production>; blank-line separators
// between chunks are preserved as raw whitespace.
function tokenizeGrammarBlock(text) {
  const parts = text.split(/(\n[ \t]*\n)/);
  let out = "";
  for (const part of parts) {
    if (/^\n[ \t]*\n$/.test(part)) {
      out += part;
    } else if (part.trim()) {
      out += tokenizeGrammarProduction(part);
    } else {
      out += part;
    }
  }
  return out;
}

// Tokenize a one-line inline grammar snippet (the form that appears
// mid-paragraph, e.g. "MV of <emu-grammar>DecimalDigit :: `0`</emu-grammar>").
// No <emu-production>/<emu-rhs> wrapping — tc39's inline form is flat.
function tokenizeGrammarInline(text) {
  return tokenizeGrammarLine(text, true);
}

// Render <emu-grammar> blocks with token-aware tokenization so non-terminals,
// terminals, parameters, geqs, modifiers, and descriptions are individually
// styleable via CSS (see app/ecma-spec.css). The same tag is used both inline
// (mid-paragraph "MV of <emu-grammar>DecimalDigit :: `0`</emu-grammar>") and
// as a block-level definition; tell them apart by looking at what precedes
// the opening tag — only-whitespace → block, otherwise inline. Block-form
// gets type="definition" to match tc39's serialization.
function applyGrammarSubst(html) {
  return html.replace(
    /<emu-grammar([^>]*?)>([\s\S]*?)<\/emu-grammar>/g,
    (full, _attrs, inner, offset, source) => {
      const lineStart = source.lastIndexOf("\n", offset - 1) + 1;
      const isBlock = source.slice(lineStart, offset).trim() === "";
      const trimmed = inner.replace(/^\s*\n/, "").replace(/\n\s*$/, "");
      if (isBlock) {
        return `<emu-grammar type="definition">${
          tokenizeGrammarBlock(dedent(trimmed))
        }</emu-grammar>`;
      }
      return `<emu-grammar>${
        tokenizeGrammarInline(trimmed.trim())
      }</emu-grammar>`;
    },
  );
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
const inlineSkipTags = new Set([
  "pre",
  "code",
  "emu-grammar",
  "emu-not-ref",
  "script",
  "style",
]);

function transformInlineText(text) {
  // Pull backtick-wrapped runs out first and replace them with a NUL-marker
  // placeholder so the later `*` / `_` regexes can't reach across the
  // generated <code>…</code> boundaries (e.g. `*` adjacent to `**` is the
  // case in ApplyStringOrNumericBinaryOperator's heading).
  const code = [];
  let out = text.replace(/`([^`\n]+)`/g, (_, c) => {
    code.push(c);
    return `\x00${code.length - 1}\x00`;
  });
  out = out.replace(
    /\|([A-Za-z][A-Za-z0-9_]*(?:\[[^\]]*\])?\??)\|/g,
    "<emu-nt>$1</emu-nt>",
  );
  out = out.replace(/~([^\s~][^~]*?)~/g, "<emu-const>$1</emu-const>");
  out = out.replace(
    /%([A-Za-z][A-Za-z0-9.@]*)%/g,
    "<emu-intrinsic>%$1%</emu-intrinsic>",
  );
  out = out.replace(/\*([^*\s][^*]*?[^*\s]|[^*\s])\*/g, "<b>$1</b>");
  out = out.replace(
    /(?<![A-Za-z0-9_])_([A-Za-z][A-Za-z0-9_]*)_(?![A-Za-z0-9_])/g,
    "<var>$1</var>",
  );
  return out.replace(
    /\x00(\d+)\x00/g,
    (_, i) => `<code>${code[Number(i)]}</code>`,
  );
}

function applyInlineMarkup(html) {
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>|<!--[\s\S]*?-->/g;
  let out = "";
  let last = 0;
  let skipDepth = 0;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    const text = html.slice(last, m.index);
    out += skipDepth === 0 ? transformInlineText(text) : text;
    out += m[0];
    if (m[1]) {
      const tag = m[1].toLowerCase();
      if (inlineSkipTags.has(tag)) {
        if (m[0].startsWith("</")) skipDepth = Math.max(0, skipDepth - 1);
        else if (!m[0].endsWith("/>")) skipDepth++;
      }
    }
    last = tagRe.lastIndex;
  }
  const tail = html.slice(last);
  out += skipDepth === 0 ? transformInlineText(tail) : tail;
  return out;
}

fs.rmSync(CONTENT_DIR, { recursive: true, force: true });
fs.rmSync(LIB_DIR, { recursive: true, force: true });
fs.mkdirSync(CONTENT_DIR, { recursive: true });
fs.mkdirSync(LIB_DIR, { recursive: true });

const meta = {};
let totalBytes = 0;
built.forEach((c) => {
  const { slug, pageSlug, chapterNum, tree } = c;
  const sections = flattenTree(tree).map(([k, v]) => [
    k,
    applyInlineMarkup(
      applyXrefSubst(
        applyProdrefSubst(
          applyGrammarSubst(applyAlgSubst(applyFloatNum(applyNoteNum(v)))),
        ),
      ),
    ),
  ]);
  const sectionsObj = Object.fromEntries(sections);

  // basePath is already baked into href values in this map (see pathFor in
  // build-chapters.mjs), so the runtime is just lookup + dangerouslySetInnerHTML.
  const componentSrc = [
    "// Generated from ecma262/spec.html — do not edit by hand.",
    `const sections = ${JSON.stringify(sectionsObj)};`,
    "export function Sec({ id }) {",
    "  const html = sections[id] ?? '';",
    '  return <div className="ecma-spec" dangerouslySetInnerHTML={{ __html: html }} />;',
    "}",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(LIB_DIR, `${slug}.jsx`), componentSrc);
  totalBytes += componentSrc.length;

  const chapterAnchor = `<span id="${c.id}" /> `;
  const chapterTitleRich = transformInlineText(c.title);
  let chapterHeading;
  if (c.kind === "emu-intro") {
    chapterHeading = `# ${chapterAnchor}${chapterTitleRich}`;
  } else if (c.kind === "emu-annex") {
    chapterHeading = c.backMatter
      ? `# ${chapterAnchor}${chapterTitleRich}`
      : `# ${chapterAnchor}Annex ${chapterNum} (${
        c.normative ? "normative" : "informative"
      }) ${chapterTitleRich}`;
  } else {
    chapterHeading = `# ${chapterAnchor}${chapterNum} ${chapterTitleRich}`;
  }

  const mdxLines = [
    `import { Sec } from '../lib/spec/${slug}'`,
    "",
    chapterHeading,
    "",
    ...renderMdxTree(tree, chapterNum, "", 2),
  ];
  const mdx = mdxLines.join("\n").replace(/\n{3,}/g, "\n\n").replace(
    /\n*$/,
    "\n",
  );
  fs.writeFileSync(path.join(CONTENT_DIR, `${pageSlug}.mdx`), mdx);

  // Sidebar label is plain text rendered by Nextra, so decode entities
  // (e.g. "&lt;&lt;" → "<<") and leave ecmarkup shorthand alone — markup
  // tags would show up as literal text in the sidebar.
  const titlePlain = decodeEntities(c.title);
  const display = c.kind === "emu-intro"
    ? titlePlain
    : c.kind === "emu-annex"
    ? (c.backMatter
      ? titlePlain
      : `Annex ${chapterNum} (${
        c.normative ? "normative" : "informative"
      }) ${titlePlain}`)
    : `${chapterNum} ${titlePlain}`;
  meta[pageSlug] = display;
});

fs.writeFileSync(
  path.join(CONTENT_DIR, "_meta.js"),
  `export default ${JSON.stringify(meta, null, 2)}\n`,
);

// Mirror spec images to public/ so the spec HTML's <img src="img/..."> resolves.
fs.rmSync(PUBLIC_IMG_DIR, { recursive: true, force: true });
fs.mkdirSync(PUBLIC_IMG_DIR, { recursive: true });
let imgCount = 0;
for (const name of fs.readdirSync(SPEC_IMG_DIR)) {
  if (/\.(svg|png|jpe?g|gif|webp|ico)$/i.test(name)) {
    fs.copyFileSync(
      path.join(SPEC_IMG_DIR, name),
      path.join(PUBLIC_IMG_DIR, name),
    );
    imgCount++;
  }
}

console.log(
  `Generated ${chapters.length} chapters (${
    (totalBytes / 1024 / 1024).toFixed(2)
  } MB of JSX), ${imgCount} images`,
);
