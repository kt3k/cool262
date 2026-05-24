import nextra from 'nextra'

const withNextra = nextra({
  // Nextra-specific options
})

// On GitHub Actions we deploy to https://kt3k.github.io/cool262/ — a project
// page, so basePath must include the repo name. Local `next dev` keeps it
// empty.
const basePath = process.env.GITHUB_ACTIONS === 'true' ? '/cool262' : ''

export default withNextra({
  output: 'export',
  basePath,
  images: { unoptimized: true },
  // Mirror basePath into a NEXT_PUBLIC_* env var so the Sec components can
  // prefix the raw <a href="/…"> cross-references they embed via
  // dangerouslySetInnerHTML (Next's basePath only auto-rewrites <Link> and
  // <Image>, not raw HTML).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
})
