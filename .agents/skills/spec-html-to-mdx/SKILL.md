---
name: spec-html-to-mdx
description: Convert an ecmarkup-rendered HTML spec (e.g. tc39/ecma262 spec.html) into per-chapter MDX pages in a Nextra v4 documentation site. Splits at top-level <emu-intro>/<emu-clause>/<emu-annex>, recurses into nested clauses to lift their headings out as numbered markdown headings, embeds each section's HTML body via dangerouslySetInnerHTML (sidestepping JSX parsing of unbalanced ecmarkup tags), and expands ecmarkup's build-time constructs (<emu-xref>, <emu-prodref>, <emu-grammar>, <emu-alg>, and Markdown-style inline markup like _x_/*foo*/|Foo|) into rendered HTML so the page is readable without ecmarkup's own runtime. Use when the user asks to render a single-file ecmarkup spec as browsable chapter pages.
---

# spec-html-to-mdx

Convert a single-file ecmarkup HTML spec into per-chapter MDX pages for a Nextra v4 site. The splitter recurses into nested clauses so subsection headings appear in the sidebar TOC, and the build script eagerly resolves ecmarkup's build-time constructs (cross-refs, production refs, algorithm lists, inline shorthand) so the rendered page looks reasonable without shipping ecmarkup's CSS/JS runtime.

## When to use

- The source is one large HTML file authored with ecmarkup (top-level `<emu-intro>`, `<emu-clause>`, `<emu-annex>` elements at column 0). TC39's `ecma262/spec.html` is the canonical example.
- The target is a Nextra v4 site using the `content/` directory and `nextra-theme-docs`.
- You want one MDX page per top-level chapter, navigable via Nextra's sidebar, with subsection headings ("4.1", "4.3.1", "B.1.2", …) visible in the per-page TOC and spec-id anchors (`#sec-foo`) that cross-references can target.

## Why not pure MDX

ecmarkup HTML uses unbalanced/void tags (`<li>` without close, bare `<br>`, etc.) and custom elements (`<emu-alg>`, `<emu-grammar>`, `<emu-xref>`). MDX parses content as JSX and rejects this. Embedding the raw HTML string in a Server Component via `dangerouslySetInnerHTML` sidesteps the parser entirely.

The splitter recurses into nested `<emu-clause>`/`<emu-annex>` to lift their `<h1>` titles out as markdown headings in the MDX, while keeping each section's body (paragraphs, algorithms, grammars, tables — everything between the heading and the next nested clause) as a raw-HTML JSX fragment. Headings end up in Nextra's sidebar TOC; bodies stay opaque to the MDX parser.

## Steps

1. **Verify Nextra v4 setup.** Required:
   - `mdx-components.jsx` exporting `useMDXComponents` (default from `create-nextra-app`).
   - `app/layout.jsx` rendering `<Layout pageMap={await getPageMap()}>`.
   - **A catch-all route at `app/[[...mdxPath]]/page.jsx`** — without it every content page 404s. Copy `templates/catch-all-route.jsx` from this skill if absent. It wraps `importPage` so a missing path renders the not-found UI instead of leaking `Cannot find module`. Adjust the `useMDXComponents` import path to point to the project's `mdx-components.jsx`.

2. **Patch `nextra-theme-docs@4.6.x` schema bug.** Versions 4.6.0/4.6.1 declare `children: reactNode` (required) in `LayoutPropsSchema` but the `Layout` runtime destructures `children` out before calling `safeParse`, so every page renders with `Invalid input: expected nonoptional → at children`. Copy `scripts/patch-nextra-theme.mjs` into the project and wire it as `postinstall` in `package.json`. Confirm fixed in 4.7+ before applying blindly — read `node_modules/nextra-theme-docs/dist/schemas.js` and `dist/layout.js` to verify the destructure-then-validate pattern still exists.

3. **Run the chapter splitter.** Copy `scripts/build-chapters.mjs` into the project's `scripts/` and invoke it with CLI args:

   ```bash
   node scripts/build-chapters.mjs \
     --input ecma262/spec.html \
     --content-dir content \
     --lib-dir lib/spec \
     --public-img-dir public/img \
     --base-path /ecma262/draft   # empty for local dev
   ```

   `--input` is required; the rest have sensible defaults relative to `process.cwd()`. `--base-path` is baked into the xref hrefs at build time (no runtime env mirror needed). It does, in order:

   - Reads the file given by `--input`.
   - Regex-matches `^<(emu-(?:intro|clause|annex))\b[^>]*>$` (multiline). Only matches at column 0, which is the ecmarkup convention for top-level chapters — nested clauses are indented.
   - For each chapter, recursively walks nested `<emu-clause>` / `<emu-annex>` elements (depth-balanced by tag name) to build a section tree. Each node records its `id`, `<h1>` title, and the "pre-body" HTML — everything between this node's opening and its first nested child.
   - Numbers chapters: `emu-intro` → no prefix; `emu-clause` → 1, 2, 3, …; `emu-annex` → A, B, C, … with letter labels.
   - Subsection numbering concatenates the chapter prefix with `.`-joined child indexes: `4.1`, `4.3.1`, `B.1.2`. Markdown heading depth grows with nesting and is clamped at `######`.
   - Scans every `<emu-grammar type="definition">` block (skipping `example`-flagged ones) and splits it into per-LHS productions on blank-line boundaries; result is the `grammarDefs` map used by prodref resolution.
   - Builds a global `idToSection` map (`id → { number, slug }`) so cross-chapter `<emu-xref>` references resolve.
   - For each section's HTML, runs five substitution passes in this order:

     | pass | rewrites | to |
     |---|---|---|
     | `applyAlgSubst` | `<emu-alg>` body's `1.` / `*` Markdown-style lines | nested `<ol>` / `<ul>` (gobbling deeper-indent non-bullet lines as continuations; stripping `[id=…]`/`[declared=…]` step attrs) |
     | `applyGrammarSubst` | `<emu-grammar>...</emu-grammar>` | `<pre class="emu-grammar">` if opening tag starts its line, else inline `<code class="emu-grammar">`; body tokenized via `tokenizeGrammarBlock` into `<span class="nt\|t\|geq\|p\|mod\|desc\|oneof\|cm">` so each token is individually styleable |
     | `applyProdrefSubst` | empty `<emu-prodref name="X">` | `<pre class="emu-grammar">` containing X's production text from `grammarDefs`, also run through `tokenizeGrammarBlock` |
     | `applyXrefSubst` | both empty and non-empty `<emu-xref href="#id">` | `<a href="<path>#<id>">…</a>` (text = section number for empty, original text for non-empty) |
     | `applyInlineMarkup` | text outside `<pre>`/`<code>`/`<emu-grammar>`/`<emu-not-ref>` | `` `foo` `` → `<code>`, `\|Foo\|` → `<emu-nt>`, `~enum~` → `<emu-const>`, `%Foo.Bar%` → `<emu-intrinsic>`, `*foo*` → `<b>`, `_x_` → `<var>` |

   - Writes:
     - `lib/spec/<slug>.jsx` — Server Component exporting `Sec({ id })`. Sections are stored in a `sections` map (keyed by dotted path: `""` for chapter pre-body, `"1"`, `"3.2"`, …) of raw HTML strings. xref hrefs already include `--base-path` baked in, so the component is just `sections[id]` + `dangerouslySetInnerHTML`.
     - `content/<slug>.mdx` — imports `Sec`, emits the chapter heading with an inline `<span id="<spec-id>" />` anchor before the title text, then for each tree node a `<Sec id="…" />` followed by the child's markdown heading (also with anchor). Heading text itself is also run through `transformInlineText`, so titles like "ToPrimitive ( `_input_`, `~string~` … )" emit real `<var>`/`<emu-const>` tags inline. The spec's Introduction (`emu-intro`) is written to `content/index.mdx` so it serves at site root.
   - Anchors are `<span id>`, not `<a id>`: Nextra's TOC wraps each heading's content in its own `<a href="#…">`, and a nested `<a>` inside is invalid HTML and triggers a hydration error.
   - `transformInlineText` first replaces every backtick-wrapped run with a NUL-marker placeholder, applies the other shorthand regexes, then restores the placeholders as `<code>…</code>`. Without this, e.g. `` `**`, `*` `` in `ApplyStringOrNumericBinaryOperator`'s heading would let the `*` regex match across two `<code>` spans and produce invalid HTML that MDX rejects.
   - Mirrors `ecma262/img/*` to `public/img/` so the spec HTML's `<img src="img/…">` resolves at runtime.
   - Generates `content/_meta.js` with numbered sidebar labels (`1 Scope`, `Annex A: Grammar Summary`, …). Labels are run through a small `decodeEntities` helper so `&lt;&lt;` / `&infin;` / `&ldquo;` show up as `<<` / `∞` / `“` in the sidebar text.
   - Wipes `content/`, `lib/spec/`, and `public/img/` at the start, so the script is idempotent.

4. **Drop in `templates/ecma-spec.css`** at `app/ecma-spec.css` and `import './ecma-spec.css'` in `app/layout.jsx` after the Nextra theme stylesheet. Highlights:
   - A single panel surface (`--ecma-panel-bg/border/radius` CSS vars) shared by `<emu-note>` callouts, grammar `<pre>` blocks, and inline `<code>` chips so all three feel like one design language (Linear-docs influence).
   - Asymmetric heading rhythm (`main[data-pagefind-body] article h2/h3/h4`) — large top margin, tight bottom — so section boundaries pop. The selector specificity (0,1,3) beats Nextra's utility classes (0,1,0) given that this stylesheet imports after `nextra-theme-docs/style.css`.
   - Spec-body links carry a faint always-visible underline that deepens on hover (xrefs are dense, easier to spot). Scoped to `.ecma-spec` so navbar/sidebar links keep Nextra's own treatment.
   - `<emu-alg>` hierarchical step numbering (decimal → lower-alpha → lower-roman cycling).
   - `<emu-note>` "NOTE" label via `::before`.
   - `<emu-eqn>` math/serif font, `<emu-nt>` italic, `<emu-const>` small-caps, `<emu-intrinsic>` monospace.
   - Grammar-token spans (`.nt/.t/.geq/.p/.mod/.desc/.oneof/.cm`) styled via opacity so both light and dark themes work.
   - Hides Nextra's per-page single-item breadcrumb (duplicates the H1).

5. **Wire navigation.** The generated `content/_meta.js` already orders all chapters; no manual wiring needed unless you want to add non-spec pages.

6. **Verify with `next build`.** Watch for two signals:
   - "Failed to get the last modified timestamp from Git" warnings are harmless — Nextra reads git history per file and warns when the files aren't committed yet.
   - Pre-render errors mean either the catch-all route is missing or the schema patch hasn't been applied. Run `next dev` and `curl` a page to get the unminified error.

## Output sizes

Expect ~2.8 MB of JSX across `lib/spec/` for the full TC39 spec (38 chapters), up from the ~2.5 MB baseline because of the eagerly-expanded markup. Largest single chapter is ~200 KB (sec-text-processing). Build is ~50–60 s on Turbopack. Consider gitignoring `lib/spec/`, `content/`, and `public/img/` and treating them as build artifacts — the script regenerates from `spec.html` deterministically.

## Known limitations

- **Inline `*foo*` matcher is conservative.** Requires non-space at both ends of the wrap, so `*x*` and `*+0*` work but unusual cases like `*a *b*` won't. Spec authors should be writing tight markup anyway.
- **Grammar tokens aren't linked.** `tokenizeGrammarBlock` emits `<span class="nt">…</span>` for nonterminal references but doesn't wrap them in `<a href="…">` pointing at the canonical definition (the grammar summary annex would be the natural target). Add link-wrapping in `tokenizeGrammarLine` if you want clickable production cross-refs.
- **basePath is build-time, not run-time.** Each Next config + build:chapters invocation has to agree on the basePath (we use a single `BASE_PATH` env var in `package.json`'s `build` script for that). If you change basePath without rebuilding, hrefs in `lib/spec/*.jsx` will be stale.

## Files in this skill

- `scripts/build-chapters.mjs` — the splitter + substitutor. Stand-alone, only needs Node 18+.
- `scripts/patch-nextra-theme.mjs` — idempotent patch for the children-schema bug. Safe to run repeatedly; warns instead of erroring if the target line is missing.
- `templates/catch-all-route.jsx` — drop into `app/[[...mdxPath]]/page.jsx`. Wraps `importPage` to render 404 on `MODULE_NOT_FOUND`. Adjust the relative path to `mdx-components.jsx` if the catch-all is nested deeper.
- `templates/ecma-spec.css` — drop into `app/ecma-spec.css` and import from `app/layout.jsx`. Provides the visual treatment that ecmarkup's own CSS would normally give.
