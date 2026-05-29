// Minimal default layout used by every MDX page in this PoC. Strips Nextra's
// chrome down to: language attr, charset, title, stylesheet, content slot.
// ssx-based JSX (the engine Lume's jsx plugin ships with) renders this to a
// plain HTML string at build time.
//
// BASE_PATH lets the same build target both `localhost/` (empty prefix) and
// `kt3k.github.io/ecma262/lume-poc/` (non-empty prefix). CI passes the
// gh-pages prefix as an env var; local `deno task build` leaves it empty.
const basePath = Deno.env.get("BASE_PATH") ?? "";

export default function Page(
  { children, title }: { children: unknown; title?: string },
) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title ?? "ECMA-262"}</title>
        <link rel="stylesheet" href={`${basePath}/styles.css`} />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
