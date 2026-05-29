import Header from "./header.tsx";
import Sidebar from "./sidebar.tsx";
import Footer from "./footer.tsx";
import PrevNext from "./prev-next.tsx";

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
        {
          /* Set the theme class before any styles apply so returning visitors
            don't see a light-mode flash. Reads localStorage with a
            prefers-color-scheme fallback. The matching click handler is
            wired below after the body mounts. */
        }
        <script
          dangerouslySetInnerHTML={{
            __html:
              `(function(){var p=localStorage.getItem("theme");var d=p==="dark"||(p===null&&matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark");})();`,
          }}
        />
        <link rel="stylesheet" href={`${basePath}/styles.css`} />
        {
          /* Pagefind UI: tiny CSS + JS bundle loaded from CDN. The actual
            search index sits under `${basePath}/pagefind/` and gets generated
            after the Lume build by `deno task pagefind` / CI. Without the
            index the input still mounts but searches return nothing. */
        }
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@pagefind/default-ui@1/css/ui.css"
        />
        <script
          defer
          src="https://cdn.jsdelivr.net/npm/@pagefind/default-ui@1/dist/ui.js"
        >
        </script>
        <script
          dangerouslySetInnerHTML={{
            __html:
              `window.addEventListener("DOMContentLoaded",()=>{new PagefindUI({element:"#search",bundlePath:"${basePath}/pagefind/",showSubResults:true});});`,
          }}
        />
      </head>
      <body>
        {
          /* a11y: keyboard users can jump past the header + sidebar to land
            on the article without tabbing through every nav link first.
            Hidden visually; revealed on focus by the .skip-nav CSS. */
        }
        <a class="skip-nav" href="#content">Skip to content</a>
        <Header basePath={basePath} />
        <Sidebar
          basePath={basePath}
          currentSlug={slug ?? ""}
          fallbackBase={fallbackBase}
        />
        <main id="content">
          {children}
          <PrevNext
            basePath={basePath}
            currentSlug={slug ?? ""}
            fallbackBase={fallbackBase}
          />
        </main>
        <aside class="toc">
          <h2>On this page</h2>
          <ol></ol>
        </aside>
        <Footer />
        {
          /* Backdrop that dims content while the mobile sidebar is open;
            clicking it closes the menu. Hidden by default (CSS); revealed
            when body has .menu-open. */
        }
        <div id="menu-backdrop" class="menu-backdrop"></div>
        {
          /* Theme toggle + hamburger menu click handlers. Sit at the end of
            <body> so the target elements exist when listeners attach. */
        }
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.getElementById("theme-toggle").addEventListener("click",function(){
                var d=document.documentElement.classList.toggle("dark");
                localStorage.setItem("theme",d?"dark":"light");
              });
              var menuBtn=document.getElementById("menu-toggle");
              var backdrop=document.getElementById("menu-backdrop");
              function setMenu(open){
                document.body.classList.toggle("menu-open",open);
                menuBtn.setAttribute("aria-expanded",open?"true":"false");
              }
              menuBtn.addEventListener("click",function(){
                setMenu(!document.body.classList.contains("menu-open"));
              });
              backdrop.addEventListener("click",function(){setMenu(false);});
              document.addEventListener("keydown",function(e){
                if(e.key==="Escape")setMenu(false);
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
