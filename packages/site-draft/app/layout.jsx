import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './ecma-spec.css'
import { VersionSwitcher } from './version-switcher'

const siteTitle = 'ECMA-262, 18th, ES2027 (draft)'

export const metadata = {
  title: siteTitle,
  description: 'The ECMAScript Language Specification, editor\'s draft toward 18th edition / ES2027.'
}

const specCommit = process.env.NEXT_PUBLIC_SPEC_COMMIT
const specCommitUrl = process.env.NEXT_PUBLIC_SPEC_COMMIT_URL
const homeHref = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`

// Commit hash sits right next to the title; logoLink={false} lets us put our
// own anchors inside the logo (the title links home, the hash links the commit)
// without nesting them inside Nextra's logo link.
const logo = (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}>
    <a href={homeHref} style={{ color: 'inherit', textDecoration: 'none' }}>
      <b>{siteTitle}</b>
    </a>
    <VersionSwitcher />
    {specCommit ? (
      <a
        href={specCommitUrl}
        target="_blank"
        rel="noreferrer"
        title={`Built from tc39/ecma262@${specCommit}`}
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.8em',
          fontWeight: 'normal',
          color: 'var(--x-color-gray-500, #6b7280)',
        }}
      >
        {specCommit}
      </a>
    ) : null}
  </span>
)
const navbar = <Navbar logo={logo} logoLink={false} />
const editions = JSON.parse(process.env.NEXT_PUBLIC_EDITIONS || '[]')
const deployBase = process.env.NEXT_PUBLIC_DEPLOY_BASE || '/'

const footer = (
  <Footer>
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          textAlign: 'left',
          gap: '0.4rem',
        }}
      >
        <b>ECMA-262 editions</b>
        {editions.map((e) => (
          <a key={e.id} href={`${deployBase}${e.id}/`}>
            {e.title}
          </a>
        ))}
        <span style={{ marginTop: '0.5rem', color: 'var(--x-color-gray-500, #6b7280)' }}>
          MIT {new Date().getFullYear()} © Alternative Styling of ECMA-262
        </span>
      </div>
    </div>
  </Footer>
)

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          footer={footer}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/kt3k/ecma262/tree/main"
          editLink={null}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
