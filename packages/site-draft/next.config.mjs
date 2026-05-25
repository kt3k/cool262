import nextra from 'nextra'

const withNextra = nextra({
  // Nextra-specific options
})

// BASE_PATH is set by the `build` script in package.json so build:chapters and
// next build agree. Local `next dev` leaves it unset → empty basePath →
// site runs at localhost:3000.
const basePath = process.env.BASE_PATH || ''

export default withNextra({
  output: 'export',
  basePath,
  images: { unoptimized: true },
})
