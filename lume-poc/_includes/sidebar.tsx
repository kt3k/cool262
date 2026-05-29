import chapters from "./chapters.ts";

// Left sidebar: flat chapter list with the current page highlighted. In a
// full migration this would also collapse/expand nested clauses; for the
// PoC a flat list is enough to show "what would replace Nextra's sidebar".
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
    <aside class="sidebar">
      <ol>
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
    </aside>
  );
}
