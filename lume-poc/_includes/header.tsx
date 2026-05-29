// Top-of-page chrome: site title + Pagefind search box + utility nav. The
// header is sticky in CSS so it stays put while the content scrolls.
// `<div id="search">` is the mount point Pagefind UI hooks into; the index
// itself is generated post-build (see deno task pagefind / the CI step).
export default function Header({ basePath }: { basePath: string }) {
  return (
    <header class="site-header">
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
        {
          /* Theme toggle. The actual class flip + localStorage sync lives in
            the inline script at the top of <head> (page.tsx) so it can run
            before paint and avoid a light-mode flash for returning visitors.
            Two icons are baked in; CSS hides the inactive one per theme. */
        }
        <button
          id="theme-toggle"
          class="theme-toggle"
          type="button"
          aria-label="Toggle dark mode"
        >
          <svg
            class="icon-sun"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41">
            </path>
          </svg>
          <svg
            class="icon-moon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
      </nav>
    </header>
  );
}
