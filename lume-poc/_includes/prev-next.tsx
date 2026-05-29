import chapters from "./chapters.ts";

// "Previous chapter" / "Next chapter" link cards rendered at the bottom of
// each spec page. Mirrors the pagination Nextra adds at the end of <article>.
// Lookup is by slug position in the chapters array; for chapters that aren't
// Lume-rendered yet the link falls back to the gh-pages /draft/ build.
export default function PrevNext(
  { basePath, currentSlug, fallbackBase }: {
    basePath: string;
    currentSlug: string;
    fallbackBase: string;
  },
) {
  const idx = chapters.findIndex((c) => c.slug === currentSlug);
  if (idx === -1) return null;

  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx + 1 < chapters.length ? chapters[idx + 1] : null;
  if (!prev && !next) return null;

  const hrefFor = (slug: string) =>
    slug === currentSlug
      ? `${basePath}/${slug}/`
      : `${fallbackBase}/${slug === "index" ? "" : slug}`;

  return (
    <nav class="prev-next" aria-label="Chapter pagination">
      {prev
        ? (
          <a class="prev-next-link prev-link" href={hrefFor(prev.slug)}>
            <span class="prev-next-label">Previous</span>
            <span class="prev-next-title">{prev.title}</span>
          </a>
        )
        : <span></span>}
      {next
        ? (
          <a class="prev-next-link next-link" href={hrefFor(next.slug)}>
            <span class="prev-next-label">Next</span>
            <span class="prev-next-title">{next.title}</span>
          </a>
        )
        : <span></span>}
    </nav>
  );
}
