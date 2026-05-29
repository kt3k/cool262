// Page footer: edition switch links + copyright. Currently the four
// editions are still Nextra-rendered, so we link to their gh-pages paths
// rather than to anything Lume-rendered; in a real migration this list
// would grow a "Lume" column.
export default function Footer({ fallbackBase }: { fallbackBase: string }) {
  return (
    <footer class="site-footer">
      <div class="footer-cols">
        <div>
          <a href={`${fallbackBase}/`}>Draft</a>
          <a href="/ecma262/es2026/">ECMA-262, 2026 edition</a>
          <a href="/ecma262/es2025/">ECMA-262, 2025 edition</a>
          <a href="/ecma262/es2024/">ECMA-262, 2024 edition</a>
        </div>
        <div>
          <a href="/ecma262/about/">About</a>
          <a href="/ecma262/pipeline/">How it's built</a>
          <span class="copyright">
            {new Date().getFullYear()} ©{" "}
            <a
              href="https://github.com/kt3k/ecma262"
              target="_blank"
              rel="noreferrer"
            >
              ECMA-262 Restyled
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
