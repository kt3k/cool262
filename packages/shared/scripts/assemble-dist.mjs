// Combine every site's static export into a single dist/ for GitHub Pages.
//
//   packages/site-<id>/out/  ->  dist/<id>/
//   dist/index.html          <- landing page linking to each version
//
// Run from anywhere after `pnpm build:all`; paths resolve off the repo root.
import fs from "node:fs";
import path from "node:path";
import { readEditions } from "./editions.mjs";

const root = path.resolve(import.meta.dirname, "../../..");
const packagesDir = path.join(root, "packages");
const distDir = path.join(root, "dist");

const editions = readEditions(root);

if (editions.length === 0) {
  console.error("[assemble-dist] no packages/site-* found");
  process.exit(1);
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const edition of editions) {
  const out = path.join(packagesDir, `site-${edition.id}`, "out");
  if (!fs.existsSync(out)) {
    console.error(
      `[assemble-dist] missing build output: ${out}\n` +
        "  run `pnpm build:all` first",
    );
    process.exit(1);
  }
  fs.cpSync(out, path.join(distDir, edition.id), { recursive: true });
}

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Shared shell for the top-level static pages (landing + about).
const page = (title, main, css) =>
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title)}</title>
  <style>
${css}
  </style>
</head>
<body>
${main}
</body>
</html>
`;

const landingCss =
  `    body { font: 16px/1.6 system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem; }
    h1 { font-size: 1.4rem; }
    ul { list-style: none; padding: 0; }
    li { margin: 0.5rem 0; }
    a { text-decoration: none; color: #0366d6; }
    a:hover { text-decoration: underline; }
    a.commit { color: #57606a; font-size: 0.85em; }
    a.commit code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    nav { margin-top: 2rem; font-size: 0.9em; }`;

// Editorial styling for the top-level article pages (/about, /pipeline),
// evoking the Ghost "Edition" theme: Mulish sans throughout with an extra-bold
// (800) display heading, a narrow measure, roomy line-height, and muted
// underlined links. 62.5% root keeps rem ≈ px/10 (as Edition does).
const articleCss =
  `    @import url('https://fonts.googleapis.com/css2?family=Mulish:wght@400;600;700;800&display=swap');
    html { font-size: 62.5%; }
    body {
      font-family: 'Mulish', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 1.9rem;
      line-height: 1.7;
      color: #333;
      background: #fff;
      max-width: 62rem;
      margin: 14vh auto 8rem;
      padding: 0 2rem;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    h1 {
      font-family: 'Mulish', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-weight: 800;
      font-size: 4.4rem;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: #15171a;
      margin: 0 0 2rem;
    }
    p { margin: 0 0 1.6rem; }
    h2 { font-family: 'Mulish', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-weight: 700; font-size: 2.6rem; line-height: 1.25; letter-spacing: -0.01em; color: #15171a; margin: 3.4rem 0 1rem; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.86em; background: #f6f6f6; padding: 0.1em 0.35em; border-radius: 4px; }
    .flow { list-style: none; padding: 0; margin: 0 0 1.2rem; }
    .flow li { position: relative; background: #f6f6f6; border: 1px solid #e8e8e8; border-radius: 8px; padding: 1.2rem 1.6rem; }
    .flow li strong { display: block; color: #15171a; font-weight: 700; font-size: 1.7rem; }
    .flow li span { display: block; color: #6b6b6b; font-size: 1.4rem; margin-top: 0.2rem; }
    .flow li + li { margin-top: 3.4rem; }
    .flow li:not(:last-child)::after { content: "\\2193"; position: absolute; left: 50%; bottom: -2.9rem; transform: translateX(-50%); color: #bbb; font-size: 1.8rem; line-height: 1; }
    strong { font-weight: 600; color: #15171a; }
    a { color: inherit; text-decoration: underline; text-decoration-color: rgba(0,0,0,0.28); text-underline-offset: 3px; }
    a:hover { text-decoration-color: currentColor; }
    footer { margin-top: 4rem; display: flex; flex-direction: column; align-items: flex-start; gap: 0.6rem; font-size: 1.6rem; }
    footer a { color: #15171a; text-decoration: none; }
    footer a:hover { text-decoration: underline; }
    footer .copyright { margin-top: 0.8rem; color: #999; font-size: 1.4rem; }
    footer .copyright a { color: inherit; text-decoration: underline; }`;

const items = editions
  .map((s) => {
    let line = `<a href="./${s.id}/">${escape(s.title)}</a>`;
    if (s.source) {
      line +=
        ` <a class="commit" href="${s.source.url}"><code>${s.source.short}</code></a>`;
    }
    return `      <li>${line}</li>`;
  })
  .join("\n");

const landing = page(
  "ECMA-262 — all editions",
  `  <h1>ECMA-262</h1>
  <ul>
${items}
  </ul>
  <nav><a href="./about/">About</a> &middot; <a href="./pipeline/">How it's built</a></nav>`,
  landingCss,
);
fs.writeFileSync(path.join(distDir, "index.html"), landing);

// Footer shared by the article pages: the edition list (styled like the site
// footer) plus the copyright line. Edition links are relative to a /<page>/ dir.
const articleFooter = `  <footer>
${
  editions.map((s) => `    <a href="../${s.id}/">${escape(s.title)}</a>`).join(
    "\n",
  )
}
    <span class="copyright">${
  new Date().getFullYear()
} © <a href="https://github.com/kt3k/ecma262">ECMA-262 Restyled</a></span>
  </footer>`;

const writeArticle = (slug, title, main) => {
  fs.mkdirSync(path.join(distDir, slug), { recursive: true });
  fs.writeFileSync(
    path.join(distDir, slug, "index.html"),
    page(title, `${main}\n${articleFooter}`, articleCss),
  );
};

writeArticle(
  "about",
  "About | ECMA-262 Restyled",
  `  <h1>About</h1>
  <p><strong>ECMA-262 Restyled</strong> is an unofficial, reader-focused rendering of the ECMAScript® Language Specification. It mirrors the source from the official <a href="https://github.com/tc39/ecma262">tc39/ecma262</a> repository and restyles it for readability; it is <strong>not normative</strong>. For the authoritative text, see the official specification at <a href="https://tc39.es/ecma262/">tc39.es/ecma262</a>. The source for this site is at <a href="https://github.com/kt3k/ecma262">kt3k/ecma262</a>.</p>
  <p>See <a href="../pipeline/">how this site is built</a>.</p>`,
);

writeArticle(
  "pipeline",
  "How it's built | ECMA-262 Restyled",
  `  <h1>How this site is built</h1>
  <p><strong>ECMA-262 Restyled</strong> is generated automatically from the official specification, with none of the text edited by hand. Here is the whole pipeline.</p>
  <ol class="flow">
    <li><strong>tc39/ecma262</strong><span>Official source, vendored as spec.html (one per edition)</span></li>
    <li><strong>Build script</strong><span>Parses spec.html into one page per chapter (MDX / JSX)</span></li>
    <li><strong>Next.js + Nextra</strong><span>Restyled pages plus a Pagefind search index</span></li>
    <li><strong>Static site</strong><span>All editions assembled into one deploy</span></li>
  </ol>
  <h2>1 · Vendor the source</h2>
  <p>The official source from <a href="https://github.com/tc39/ecma262">tc39/ecma262</a> is vendored as a single <code>spec.html</code> per edition. The draft tracks the upstream repository as a git submodule; ES2024, ES2025, and ES2026 are pinned snapshots.</p>
  <h2>2 · Transform</h2>
  <p>A build script parses each <code>spec.html</code> into one page per top-level chapter and replays the steps the raw source leaves out: it writes the descriptive preamble under each operation's heading, numbers and links every cross-reference (sections, tables, figures, notes, and algorithm steps), and formats grammars, algorithms, and inline notation.</p>
  <h2>3 · Render &amp; assemble</h2>
  <p>Next.js and Nextra render the pages with the restyled typography, Pagefind builds the search index, and every edition is combined into one static site.</p>
  <h2>Not normative</h2>
  <p>This site mirrors the specification for readability only. For the authoritative text, always refer to <a href="https://tc39.es/ecma262/">tc39.es/ecma262</a>. Source for this project: <a href="https://github.com/kt3k/ecma262">kt3k/ecma262</a>.</p>`,
);

console.log(`[assemble-dist] assembled dist/ from ${editions.length} sites`);
