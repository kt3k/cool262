import Header from "./header.tsx";
import Sidebar from "./sidebar.tsx";
import Footer from "./footer.tsx";

// Top-level layout: header / sidebar / main / TOC / footer, wired together by
// the CSS grid in styles.css. The TOC's <ol> is empty here; a post-render
// processor in _config.ts walks the document for <emu-clause id=…> and fills
// it in. That way the layout stays static (Lume can serve it from a string)
// while the per-page outline is still data-driven.
//
// BASE_PATH lets the same build target both `localhost/` (empty prefix) and
// `kt3k.github.io/ecma262/lume-poc/` (non-empty prefix). fallbackBase is the
// gh-pages path to the still-Nextra-rendered chapters so the sidebar links
// don't die for chapters that haven't been ported to Lume yet.
const basePath = Deno.env.get("BASE_PATH") ?? "";
const fallbackBase = "/ecma262/draft";

export default function Page(
  { children, title, slug }: {
    children: unknown;
    title?: string;
    slug?: string;
  },
) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title ?? "ECMA-262"}</title>
        <link rel="stylesheet" href={`${basePath}/styles.css`} />
      </head>
      <body>
        <Header basePath={basePath} />
        <Sidebar
          basePath={basePath}
          currentSlug={slug ?? ""}
          fallbackBase={fallbackBase}
        />
        <main>{children}</main>
        <aside class="toc">
          <h2>On this page</h2>
          <ol></ol>
        </aside>
        <Footer fallbackBase={fallbackBase} />
      </body>
    </html>
  );
}
