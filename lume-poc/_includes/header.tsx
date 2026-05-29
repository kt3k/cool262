// Top-of-page chrome: site title that links home + (placeholder) version
// switcher slot. The header is sticky in CSS so it stays put while the
// content scrolls.
export default function Header({ basePath }: { basePath: string }) {
  return (
    <header class="site-header">
      <a class="site-title" href={`${basePath}/`}>
        <b>ECMA-262</b> <span class="qual">lume-poc</span>
      </a>
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
