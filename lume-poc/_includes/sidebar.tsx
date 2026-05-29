import chapters from "./chapters.ts";

// Left sidebar: flat chapter list at top, sticky theme toggle at bottom.
// The list scrolls; the footer area doesn't — same affordance Nextra's
// `<div class="nextra-sidebar-footer">` provides.
//
// Only the current chapter actually links to a Lume-rendered page; siblings
// link to the existing Next.js/Nextra-rendered draft so the navigation isn't
// dead until those chapters get ported too.
export default function Sidebar(
  { basePath, currentSlug, fallbackBase }: {
    basePath: string;
    currentSlug: string;
    fallbackBase: string;
  },
) {
  return (
    <aside id="sidebar" class="sidebar">
      <ol class="sidebar-list">
        {chapters.map((c) => {
          const isCurrent = c.slug === currentSlug;
          const href = isCurrent
            ? `${basePath}/${c.slug}/`
            : `${fallbackBase}/${c.slug === "index" ? "" : c.slug}`;
          return (
            <li class={isCurrent ? "current" : ""}>
              <a href={href}>{c.title}</a>
            </li>
          );
        })}
      </ol>
      <div class="sidebar-footer">
        {
          /* Theme toggle. Click handler + early-paint .dark class flip are wired
            in page.tsx so the button can sit anywhere in the layout (here, in
            the non-scrolling sidebar footer, matches Nextra's placement). */
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
            width="16"
            height="16"
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
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <span class="theme-toggle-label">
            <span class="label-light">Light</span>
            <span class="label-dark">Dark</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
