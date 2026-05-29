# lume-poc-2

Variant of `lume-poc` with a Nextra-style DOM: sidebar + main + TOC live inside
a single `<div class="layout-wrapper">` (grid columns), and the footer sits
OUTSIDE that wrapper as its own sibling. This makes the sticky sidebar/TOC's
containing block end right above the footer, so they slide out of view as the
footer scrolls in — instead of bleeding past, which the original `lume-poc`'s
body-level grid layout did.

Deploys to `/ecma262/lume-poc-2/` on gh-pages for side-by-side comparison with
`/ecma262/lume-poc/`.

## What's here

- `_config.ts` — Lume entry point. Enables the `jsx` and `mdx` plugins and calls
  `site.build()` inline so we can run via `deno task build` without going
  through Lume's CLI (which doesn't see this directory's `deno.json` when
  fetched from `deno.land`).
- `_includes/page.tsx` — minimal layout: `<html>` shell + stylesheet link
  - a single `<main>` content slot. The stripped-down replacement for
    `nextra-theme-docs`'s `<Layout>`.
- `notational-conventions.mdx` — the same MDX `packages/site-draft/content/`
  uses, with the `Sec` import path adjusted to
  `./lib/notational-conventions.jsx`.
- `lib/notational-conventions.jsx` — copy of the `<Sec>` component that
  `build-chapters.mjs` generates, untouched (uses `dangerouslySetInnerHTML`,
  which works in Lume's ssx renderer the same way it does in React).
- `styles.css` — copy of `packages/shared/templates/ecma-spec.css`, unedited.
  Most rules carry over verbatim; a few that key on `main[data-pagefind-body]`
  or `html.dark` are dead in this PoC but harmless.

## Running

```
deno task build       # writes _site/notational-conventions/index.html
```

## Result vs tc39.es

Element counts inside `#spec-container` (Lume vs tc39's notational-conventions
page):

| element                                    | Lume PoC   | tc39       |
| ------------------------------------------ | ---------- | ---------- |
| `emu-clause`                               | 30         | 30         |
| `emu-grammar`                              | 34         | 34         |
| `emu-production`                           | 42         | 42         |
| `emu-rhs`                                  | 75         | 75         |
| `emu-nt`                                   | 193        | 193        |
| `emu-t`                                    | 75         | 75         |
| `emu-val`                                  | 27         | 27         |
| `emu-note`                                 | 3          | 3          |
| `.secnum` / `.inline` / `.field` / `.note` | 30/21/13/3 | 30/21/13/3 |

Differences from the Nextra-rendered draft site:

- No Tailwind atomic classes (`x:text-4xl`, `x:font-bold`, …) on headings — the
  CSS that fought Nextra's defaults can be deleted.
- No `.subheading-anchor` button next to each heading.
- No breadcrumb. No mobile nav. No right-rail TOC.
- Heading levels are markdown-derived (h1/h2/h3/h4) instead of the all-h1 trick
  Item 9 used. A rehype plugin could flatten them if we want exact tc39 parity,
  but it's now optional rather than fighting the framework.

## What's still missing for a full migration

See `docs/lume_migration.md` for the full inventory. Highlights:

- Left sidebar (page tree) — needs a custom component reading `_meta.js`
- Right TOC (on-this-page) — `lume_plugin_toc` or hand-rolled
- Dark/light mode toggle — JS + CSS, ~50 lines
- Pagefind integration — runs the same way against `_site/`
- Multi-version build (draft / es2024 / es2025 / es2026)
- VersionSwitcher port (currently React, would become ssx JSX)
