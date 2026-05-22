---
name: spec-html-to-mdx
description: Convert an ecmarkup-rendered HTML spec (e.g. tc39/ecma262 spec.html) into per-chapter MDX pages in a Nextra v4 documentation site. Splits at top-level <emu-intro>/<emu-clause>/<emu-annex>, recurses into nested clauses to lift their headings out as numbered markdown headings ("4.1 Web Scripting"), and embeds each section's HTML body via dangerouslySetInnerHTML to sidestep JSX parsing of unbalanced ecmarkup tags. Use when the user asks to render a single-file ecmarkup spec as browsable chapter pages.
---

# spec-html-to-mdx

Convert a single-file ecmarkup HTML spec into per-chapter MDX pages for a Nextra v4 site, with nested subsection headings surfaced into Nextra's sidebar TOC.

## When to use

- The source is one large HTML file authored with ecmarkup (top-level `<emu-intro>`, `<emu-clause>`, `<emu-annex>` elements at column 0). TC39's `ecma262/spec.html` is the canonical example.
- The target is a Nextra v4 site using the `content/` directory and `nextra-theme-docs`.
- You want one MDX page per top-level chapter, navigable via Nextra's sidebar, with subsection headings ("4.1", "4.3.1", "B.1.2", …) visible in the per-page TOC.

## Why not pure MDX

ecmarkup HTML uses unbalanced/void tags (`<li>` without close, bare `<br>`, etc.) and custom elements (`<emu-alg>`, `<emu-grammar>`, `<emu-xref>`). MDX parses content as JSX and rejects this. Embedding the raw HTML string in a Server Component via `dangerouslySetInnerHTML` sidesteps the parser entirely.

The splitter recurses into nested `<emu-clause>`/`<emu-annex>` to lift their `<h1>` titles out as markdown headings in the MDX, while keeping each section's body (paragraphs, algorithms, grammars, tables — everything between the heading and the next nested clause) as a raw-HTML JSX fragment. Headings end up in Nextra's sidebar TOC; bodies stay opaque to the MDX parser.

## Steps

1. **Verify Nextra v4 setup.** Required:
   - `mdx-components.jsx` exporting `useMDXComponents` (default from `create-nextra-app`).
   - `app/layout.jsx` rendering `<Layout pageMap={await getPageMap()}>`.
   - **A catch-all route at `app/[[...mdxPath]]/page.jsx`** — without it every content page 404s. Copy `templates/catch-all-route.jsx` from this skill if absent. The `import` for `useMDXComponents` must point to the project's `mdx-components.jsx`.

2. **Patch `nextra-theme-docs@4.6.x` schema bug.** Versions 4.6.0/4.6.1 declare `children: reactNode` (required) in `LayoutPropsSchema` but the `Layout` runtime destructures `children` out before calling `safeParse`, so every page renders with `Invalid input: expected nonoptional → at children`. Copy `scripts/patch-nextra-theme.mjs` into the project and wire it as `postinstall` in `package.json`. Confirm fixed in 4.7+ before applying blindly — read `node_modules/nextra-theme-docs/dist/schemas.js` and `dist/layout.js` to verify the destructure-then-validate pattern still exists.

3. **Run the chapter splitter.** Copy `scripts/build-chapters.mjs` into the project's `scripts/` and run `node scripts/build-chapters.mjs`. It:
   - Reads `ecma262/spec.html` (adjust `SPEC_FILE` if different path).
   - Regex-matches `^<(emu-(?:intro|clause|annex))\b[^>]*>$` (multiline). Only matches at column 0, which is the ecmarkup convention for top-level chapters — nested clauses are indented.
   - For each chapter, recursively walks nested `<emu-clause>` / `<emu-annex>` elements (depth-balanced by tag name) to build a section tree. Each node records its `id`, `<h1>` title, and the "pre-body" HTML — everything between this node's opening and its first nested child.
   - Numbers chapters: emu-intro → no prefix; emu-clause → 1, 2, 3, … (independent counter, so emu-intro at index 0 does not bump it); emu-annex → A, B, C, … with letter labels.
   - Subsection numbering concatenates the chapter prefix with `.`-joined child indexes: `4.1 Web Scripting`, `4.3.1 Objects`, `B.1.2 Regular Expressions Patterns`. Markdown heading depth grows with nesting and is clamped at `######`.
   - Writes:
     - `lib/spec/<slug>.jsx` — Server Component exporting `Sec({ id })`. Internally a JSON `sections` map keyed by dotted section path (`""` for the chapter pre-body, `"1"`, `"3.2"`, …) of raw HTML.
     - `content/<slug>.mdx` — imports `Sec`, emits the chapter heading (`# 4 Overview`), then for each tree node a `<Sec id="…" />` followed by the child's markdown heading and recursion. The spec's Introduction (`emu-intro`) is written to `content/index.mdx` so it serves at site root.
   - Mirrors `ecma262/img/*` to `public/img/` so the spec HTML's `<img src="img/…">` resolves at runtime.
   - Generates `content/_meta.js` with numbered sidebar labels (`1. Scope`, `Annex A: Grammar Summary`, …).
   - Wipes `content/`, `lib/spec/`, and `public/img/` at the start, so the script is idempotent.

4. **Wire navigation.** The generated `content/_meta.js` already orders all chapters; no manual wiring needed unless you want to add non-spec pages.

5. **Verify with `next build`.** Watch for two signals:
   - "Failed to get the last modified timestamp from Git" warnings are harmless — Nextra reads git history per file and warns when the files aren't committed yet.
   - Pre-render errors mean either the catch-all route is missing or the schema patch hasn't been applied. Run `next dev` and `curl` a page to get the unminified error.

## Output sizes

Expect ~2.5MB of JSX across `lib/spec/` for the full TC39 spec (38 chapters). Largest single chapter is ~150KB (sec-text-processing, sec-ecmascript-language-expressions). Build is ~60s on Turbopack. Consider gitignoring `lib/spec/`, `content/`, and `public/img/` and treating them as build artifacts — the script regenerates from `spec.html` deterministically.

## Known limitations

- **No ecmarkup styling.** The rendered chapters are unstyled HTML. Lift CSS from `https://tc39.es/ecma262/ecmarkup.css` (or copy from a built ecmarkup distribution) and import in `app/layout.jsx` if you want the canonical look.
- **Cross-references break.** `<emu-xref href="#sec-foo">` links point to anchors that exist in the *original* spec.html but are scattered across chapter pages here. Heading IDs in the generated MDX are auto-slugged from the heading text (e.g. `4-1-web-scripting`), not the spec's `sec-foo` IDs, so even same-page anchors won't match. To fix, either (a) post-process the inner HTML to rewrite `#sec-foo` → `/<slug>#sec-foo` based on which chapter contains the id, and emit explicit heading IDs via `{#sec-foo}` syntax, or (b) keep raw `<emu-xref>` and render it as a React component that resolves the id at build time.
- **Algorithm step numbering and grammar formatting** rely on ecmarkup CSS/JS. Without them, ordered lists render as plain `<ol>`.
- **HTML entities in headings** (e.g. `&amp;`, `&lt;`) are not decoded, so they render literally as `&amp;` in the markdown heading. Decode if any chapter title triggers this in practice.

## Files in this skill

- `scripts/build-chapters.mjs` — the splitter. Stand-alone, only needs Node 18+.
- `scripts/patch-nextra-theme.mjs` — idempotent patch for the children-schema bug. Safe to run repeatedly; warns instead of erroring if the target line is missing.
- `templates/catch-all-route.jsx` — drop into `app/[[...mdxPath]]/page.jsx`. Adjust the relative path to `mdx-components.jsx` if the project's catch-all is nested deeper.
