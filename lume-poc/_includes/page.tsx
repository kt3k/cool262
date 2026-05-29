// Minimal default layout used by every MDX page in this PoC. Strips Nextra's
// chrome down to: language attr, charset, title, stylesheet, content slot.
// ssx-based JSX (the engine Lume's jsx plugin ships with) renders this to a
// plain HTML string at build time.
export default function Page(
  { children, title }: { children: unknown; title?: string },
) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title ?? "ECMA-262"}</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
