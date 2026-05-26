import path from 'node:path'
import nextra from 'nextra'
import { readSpecSource } from '../shared/scripts/spec-source.mjs'

const withNextra = nextra({
  // Nextra-specific options
})

// BASE_PATH is set by the `build` script in package.json so build:chapters and
// next build agree. Local `next dev` leaves it unset → empty basePath →
// site runs at localhost:3000.
const basePath = process.env.BASE_PATH || ''

// Resolve the upstream tc39/ecma262 commit this edition was built from and
// expose it to the navbar. <id> is the package dir suffix (site-<id>).
const id = path.basename(import.meta.dirname).replace(/^site-/, '')
const source = readSpecSource(path.resolve(import.meta.dirname, '../../ecma262', id))

export default withNextra({
  output: 'export',
  basePath,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_SPEC_COMMIT: source?.short ?? '',
    NEXT_PUBLIC_SPEC_COMMIT_URL: source?.url ?? '',
  },
})
