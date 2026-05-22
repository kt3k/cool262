---
name: spec-html-to-mdx
description: Convert an ecmarkup-rendered HTML spec (e.g. tc39/ecma262 spec.html) into per-chapter MDX pages in a Nextra v4 documentation site. Splits at top-level <emu-intro>/<emu-clause>/<emu-annex>, embeds raw HTML via dangerouslySetInnerHTML to sidestep JSX parsing of unbalanced ecmarkup tags. Use when the user asks to render a single-file ecmarkup spec as browsable chapter pages.
---

# spec-html-to-mdx

Convert a single-file ecmarkup HTML spec into per-chapter MDX pages for a Nextra v4 site.

## When to use

- The source is one large HTML file authored with ecmarkup (top-level `<emu-intro>`, `<emu-clause>`, `<emu-annex>` elements at column 0). TC39's `ecma262/spec.html` is the canonical example.
- The target is a Nextra v4 site using the `content/` directory and `nextra-theme-docs`.
- You want one MDX page per top-level chapter, navigable via Nextra's sidebar.

## Why not pure MDX

ecmarkup HTML uses unbalanced/void tags (`<li>` without close, bare `<br>`, etc.) and custom elements (`<emu-alg>`, `<emu-grammar>`, `<emu-xref>`). MDX parses content as JSX and rejects this. Embedding the raw HTML string in a Server Component via `dangerouslySetInnerHTML` sidesteps the parser entirely. Trade-off: nested headings inside a chapter won't appear in Nextra's TOC (only the chapter title injected at the MDX level does).

## Steps

1. **Verify Nextra v4 setup.** Required:
   - `mdx-components.jsx` exporting `useMDXComponents` (default from `create-nextra-app`).
   - `app/layout.jsx` rendering `<Layout pageMap={await getPageMap()}>`.
   - **A catch-all route at `app/[[...mdxPath]]/page.jsx`** — without it every content page 404s. Copy `templates/catch-all-route.jsx` from this skill if absent. The `import` for `useMDXComponents` must point to the project's `mdx-components.jsx`.

2. **Patch `nextra-theme-docs@4.6.x` schema bug.** Versions 4.6.0/4.6.1 declare `children: reactNode` (required) in `LayoutPropsSchema` but the `Layout` runtime destructures `children` out before calling `safeParse`, so every page renders with `Invalid input: expected nonoptional → at children`. Copy `scripts/patch-nextra-theme.mjs` into the project and wire it as `postinstall` in `package.json`. Confirm fixed in 4.7+ before applying blindly — read `node_modules/nextra-theme-docs/dist/schemas.js` and `dist/layout.js` to verify the destructure-then-validate pattern still exists.

3. **Run the chapter splitter.** Copy `scripts/build-chapters.mjs` into the project's `scripts/` and run `node scripts/build-chapters.mjs`. It:
   - Reads `ecma262/spec.html` (adjust `SPEC_FILE` if different path).
   - Regex-matches `^<(emu-(?:intro|clause|annex))\b[^>]*>$` (multiline). Only matches at column 0, which is the ecmarkup convention for top-level chapters — nested clauses are indented.
   - Slices the HTML between adjacent matches, strips the wrapping `<emu-X>...</emu-X>` and the leading `<h1>` (rendered separately as a markdown heading), and writes:
     - `lib/spec/<slug>.jsx` — Server Component embedding the inner HTML via `JSON.stringify` (robust against any character).
     - `content/spec/<slug>.mdx` — `# <title>` heading + `<Content />`.
   - Generates `content/spec/_meta.js` with numbered sidebar labels (`1. Scope`, `Annex: Grammar Summary`, etc.).
   - Wipes both output dirs at the start, so the script is idempotent.

4. **Wire navigation.** Add `spec: 'ECMA-262 仕様'` (or appropriate label) to `content/_meta.js`.

5. **Verify with `next build`.** Watch for two signals:
   - "Failed to get the last modified timestamp from Git" warnings are harmless — Nextra reads git history per file and warns when the files aren't committed yet.
   - Pre-render errors mean either the catch-all route is missing or the schema patch hasn't been applied. Run `next dev` and `curl` a page to get the unminified error.

## Output sizes

Expect ~3MB of JSX across `lib/spec/` for the full TC39 spec (38 chapters). Largest single chapter is ~200KB (sec-text-processing, sec-ordinary-and-exotic-objects-behaviours). Build is ~60s on Turbopack. Consider gitignoring `lib/spec/` and `content/spec/` and treating them as build artifacts — the script regenerates from `spec.html` deterministically.

## Known limitations

- **No ecmarkup styling.** The rendered chapters are unstyled HTML. Lift CSS from `https://tc39.es/ecma262/ecmarkup.css` (or copy from a built ecmarkup distribution) and import in `app/layout.jsx` if you want the canonical look.
- **Cross-references break.** `<emu-xref href="#sec-foo">` links point to anchors that exist in the *original* spec.html but are scattered across chapter pages here. To fix, post-process the inner HTML to map `#sec-foo` → `/spec/<slug>#sec-foo` based on which chapter contains the id.
- **Algorithm step numbering and grammar formatting** rely on ecmarkup CSS/JS. Without them, ordered lists render as plain `<ol>`.

## Files in this skill

- `scripts/build-chapters.mjs` — the splitter. Stand-alone, only needs Node 18+.
- `scripts/patch-nextra-theme.mjs` — idempotent patch for the children-schema bug. Safe to run repeatedly; warns instead of erroring if the target line is missing.
- `templates/catch-all-route.jsx` — drop into `app/[[...mdxPath]]/page.jsx`. Adjust the relative path to `mdx-components.jsx` if the project's catch-all is nested deeper.
