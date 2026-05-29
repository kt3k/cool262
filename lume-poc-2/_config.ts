import lume from "lume/mod.ts";
import mdx from "lume/plugins/mdx.ts";
import jsx from "lume/plugins/jsx.ts";

// Minimal Lume PoC for the notational-conventions page.
// Goal: prove that Lume + MDX + Preact JSX can render the same DOM that
// Next.js + Nextra currently does, without the Nextra typography utility
// classes fighting our CSS. See docs/lume_migration.md for the broader plan.
const site = lume({
  src: ".",
  dest: "_site",
});

site.use(jsx());
site.use(mdx());

// README.md is dev documentation, not a page to ship.
site.ignore("README.md");

// Static assets that ship as-is into _site/.
site.copy("styles.css");

// Build the per-page right-rail TOC after rendering. Lume parses each .html
// page's content into a Document on demand (`page.document`); we walk the
// <emu-clause id=…> tree inside <main> to read the section number/heading,
// then fill in the empty <aside class="toc"><ol/></aside> the layout left.
// Using the <emu-clause> structure (rather than scanning h2/h3 directly) gets
// us anchor ids that match the spec's `#sec-…` convention out of the box.
site.process([".html"], (pages) => {
  for (const page of pages) {
    const document = page.document;
    if (!document) continue;
    const ol = document.querySelector("aside.toc > ol");
    const main = document.querySelector("main");
    if (!ol || !main) continue;

    const clauses = main.querySelectorAll("emu-clause[id]");
    for (const clause of clauses) {
      // Depth = how many <emu-clause> wrappers we're nested inside.
      let depth = 0;
      let p = clause.parentElement;
      while (p) {
        if (p.tagName?.toLowerCase() === "emu-clause") depth++;
        p = p.parentElement;
      }
      // Skip the chapter-top clause (depth 0) — it's the page title, the TOC
      // is per-section.
      if (depth < 1) continue;

      // First direct-child h1-h6 of this clause carries its visible title.
      let heading: Element | null = null;
      for (const child of clause.children) {
        if (/^h[1-6]$/i.test(child.tagName)) {
          heading = child;
          break;
        }
      }
      if (!heading) continue;
      const text = (heading.textContent ?? clause.id).replace(/\s+/g, " ")
        .trim();

      const li = document.createElement("li");
      li.setAttribute("data-level", String(depth));
      const a = document.createElement("a");
      a.setAttribute("href", `#${clause.id}`);
      a.textContent = text;
      li.appendChild(a);
      ol.appendChild(li);
    }
  }
});

// Run the build inline when this file is the entry point. Keeps us off the
// Lume CLI's deno.json discovery path, which doesn't see ours when the CLI
// is fetched from deno.land.
if (import.meta.main) {
  await site.build();
}

export default site;
