// Workaround for nextra-theme-docs@4.6.1: LayoutPropsSchema requires `children`
// but the Layout component destructures `children` out before validation,
// so safeParse always fails with "expected nonoptional → at children".
// Make `children` optional in the schema.
import fs from 'node:fs'
import path from 'node:path'

// Run as postinstall from the site package's cwd, where pnpm has just
// linked node_modules/nextra-theme-docs.
const schemaPath = path.resolve(
  process.cwd(),
  'node_modules/nextra-theme-docs/dist/schemas.js',
)

if (!fs.existsSync(schemaPath)) {
  console.warn(`[patch-nextra-theme] not found: ${schemaPath}`)
  process.exit(0)
}

const src = fs.readFileSync(schemaPath, 'utf8')
const target = '  children: reactNode,'
const replacement = '  children: reactNode.optional(),'

if (src.includes(replacement)) {
  console.log('[patch-nextra-theme] already patched')
  process.exit(0)
}
if (!src.includes(target)) {
  console.warn('[patch-nextra-theme] target line not found; skipping')
  process.exit(0)
}

fs.writeFileSync(schemaPath, src.replace(target, replacement))
console.log('[patch-nextra-theme] patched')
