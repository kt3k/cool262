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
      {
        /* Desktop-only expand button. Hidden while the sidebar is open;
          body.sidebar-collapsed (toggled from the sidebar footer button)
          flips it on so the user can bring the sidebar back. */
      }
      <button
        id="sidebar-expand"
        class="sidebar-expand-btn"
        type="button"
        aria-label="Show sidebar"
        title="Show sidebar"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M4.177 7.823l2.396-2.396A.25.25 0 017 5.604v4.792a.25.25 0 01-.427.177L4.177 8.177a.25.25 0 010-.354z">
          </path>
          <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0114.25 16H1.75A1.75 1.75 0 010 14.25V1.75zM1.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25H5.5v-13H1.75zM7 1.5v13h7.25a.25.25 0 00.25-.25V1.75a.25.25 0 00-.25-.25H7z">
          </path>
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
      <div id="search" class="site-search">
        {
          /* Keyboard-shortcut hint inside the search input. Pagefind UI mounts
            its <input> on top of this; CSS pins the kbd to the right edge so
            it sits inside the rounded pill without overlapping typed text. */
        }
        <kbd class="search-kbd" aria-hidden="true">
          <span class="search-kbd-mac">⌘ K</span>
          <span class="search-kbd-other">Ctrl K</span>
        </kbd>
      </div>
    </header>
  );
}
