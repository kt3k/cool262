import VersionSwitcher from "./version-switcher.tsx";
import { specCommitUrl, titleMain, titleQual } from "./editions.ts";

// Top-of-page chrome: site title (link) + status badge (link) + version
// switcher + Pagefind search box. The header is sticky in CSS so it stays put
// while the content scrolls. `<div id="search">` is the mount point Pagefind
// UI hooks into; the index itself is generated post-build (see
// deno task pagefind / the CI step).
//
// Title shape mirrors packages/shared/components/spec-layout.jsx:
//   <b>ECMA-262, 18th, ES2027</b>  <a class="qual-link"><b>draft</b></a>
// — bold main title links home, "draft" is a dotted-underline link to the
// tc39/ecma262 commit. The version-switcher chevron sits beside the title.
export default function Header(
  { basePath, deployBase }: { basePath: string; deployBase: string },
) {
  return (
    <header class="site-header">
      {
        /* Inner wrapper caps the row at --content-max-w (1440px) and
          centres it, matching Nextra's <nav class="nextra-navbar"> with an
          inner <div class="x:mx-auto x:flex x:max-w-(--nextra-content-width)">.
          Above 1440px viewports the title/search line up with the
          sidebar/main edges below; the outer .site-header keeps the
          sticky bg + border-bottom spanning the full width. */
      }
      <div class="site-header-inner">
        {
          /* Hamburger sits to the left of the title and is only visible at
            mobile widths (CSS). Click flips body.menu-open which slides the
            sidebar in as an overlay. */
        }
        <button
          id="menu-toggle"
          class="menu-toggle"
          type="button"
          aria-label="Open navigation menu"
          aria-controls="sidebar"
          aria-expanded="false"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        <span class="site-title-group">
          <a class="site-title" href={`${basePath}/`}>
            <b>{titleMain}</b>
          </a>
          {titleQual
            ? (
              <>
                {" "}
                <a
                  class="qual-link"
                  href={specCommitUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Source on GitHub"
                >
                  <b>{titleQual}</b>
                </a>
              </>
            )
            : null}
          <VersionSwitcher basePath={basePath} deployBase={deployBase} />
        </span>
        <div id="search" class="site-search" data-base={basePath}>
          {
            /* Custom search built on Pagefind core (search.js) — mirrors the
            shape of Nextra's <Search>. The <input> is our own (not mounted
            by PagefindUI); the kbd hint pins to the right edge of the
            input via CSS, hidden while the input is focused. The empty
            .search-panel below is where search.js writes the results
            dropdown when the user types. */
          }
          <input
            type="search"
            class="search-input"
            placeholder="Search documentation…"
            autocomplete="off"
            spellcheck={false}
            aria-label="Search documentation"
          />
          <kbd class="search-kbd" aria-hidden="true">
            <span class="search-kbd-mac">⌘ K</span>
            <span class="search-kbd-other">Ctrl K</span>
          </kbd>
          <div class="search-panel" role="listbox" aria-label="Search results">
          </div>
        </div>
      </div>
    </header>
  );
}
