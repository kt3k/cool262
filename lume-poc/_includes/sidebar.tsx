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
        {chapters.map((c, i) => {
          const isCurrent = c.slug === currentSlug;
          const href = isCurrent
            ? `${basePath}/${c.slug}/`
            : `${fallbackBase}/${c.slug === "index" ? "" : c.slug}`;
          // Draw a divider above each new group (annex / back-matter). The
          // first item never gets one. Detection is positional so adding /
          // reordering chapters in chapters.ts "just works".
          const prevGroup = i > 0 ? chapters[i - 1].group : undefined;
          const startsGroup = c.group !== undefined && c.group !== prevGroup;
          const classes = [
            isCurrent ? "current" : "",
            startsGroup ? "group-start" : "",
          ].filter(Boolean).join(" ");
          return (
            <li class={classes}>
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
        {
          /* Sidebar collapse button — same row as the theme toggle (matches
            Nextra's two-button .nextra-sidebar-footer row). Click flips
            body.sidebar-collapsed; an expand button in the header brings it
            back. Click handler is in page.tsx alongside the theme toggle. */
        }
        <button
          id="sidebar-collapse"
          class="sidebar-collapse-btn"
          type="button"
          aria-label="Collapse sidebar"
          aria-controls="sidebar"
          title="Collapse sidebar"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M11.823 8.177L9.427 10.573A.25.25 0 019 10.396V5.604a.25.25 0 01.427-.177l2.396 2.396a.25.25 0 010 .354z">
            </path>
            <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0114.25 16H1.75A1.75 1.75 0 010 14.25V1.75zM1.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25H5.5v-13H1.75zM7 1.5v13h7.25a.25.25 0 00.25-.25V1.75a.25.25 0 00-.25-.25H7z">
            </path>
          </svg>
        </button>
      </div>
    </aside>
  );
}
