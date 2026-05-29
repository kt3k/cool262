import editions from "./editions.ts";

// Page footer — two columns side-by-side: full edition list (left) and
// About / Pipeline / copyright (right). Matches what
// `packages/shared/components/spec-layout.jsx` renders today: no background,
// no border, just centred grey text with `gap: 4rem` between columns and
// `gap: 0.4rem` between rows inside each column. The deploy root
// (`/ecma262/`) is used for the cross-edition links since they currently
// only exist on the Nextra-rendered sites.
const deployBase = "/ecma262";

export default function Footer() {
  return (
    <footer class="site-footer">
      <div class="footer-cols">
        <div class="footer-col">
          {editions.map((e) => <a href={`${deployBase}/${e.id}/`}>{e.title}
          </a>)}
        </div>
        <div class="footer-col">
          <a href={`${deployBase}/about/`}>About</a>
          <a href={`${deployBase}/pipeline/`}>How it's built</a>
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
