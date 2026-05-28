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
    a.commit { color: #57606a; font-size: 0.85em; }
    a.commit code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  </style>
</head>
<body>
  <h1>ECMA-262</h1>
  <ul>
${items}
  </ul>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, "index.html"), html);
console.log(`[assemble-dist] assembled dist/ from ${editions.length} sites`);
