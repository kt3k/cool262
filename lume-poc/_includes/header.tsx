// Top-of-page chrome: site title + Pagefind search box + utility nav. The
// header is sticky in CSS so it stays put while the content scrolls.
// `<div id="search">` is the mount point Pagefind UI hooks into; the index
// itself is generated post-build (see deno task pagefind / the CI step).
export default function Header({ basePath }: { basePath: string }) {
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
      <a class="site-title" href={`${basePath}/`}>
        <b>ECMA-262</b> <span class="qual">lume-poc</span>
      </a>
      <div id="search" class="site-search"></div>
      <nav class="site-nav">
        <a
          href="https://github.com/kt3k/ecma262"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}
