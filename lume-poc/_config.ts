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

// Run the build inline when this file is the entry point. Keeps us off the
// Lume CLI's deno.json discovery path, which doesn't see ours when the CLI
// is fetched from deno.land.
if (import.meta.main) {
  await site.build();
}

export default site;
