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
      </nav>
    </header>
  );
}
