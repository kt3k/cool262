import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './ecma-spec.css'

const siteTitle = 'ECMA-262, 17th, ES2026 (draft)'

export const metadata = {
  title: siteTitle,
  description:
    'The ECMAScript 2026 Language Specification, 17th edition (candidate, awaiting June 2026 approval).'
}

const specCommit = process.env.NEXT_PUBLIC_SPEC_COMMIT
const specCommitUrl = process.env.NEXT_PUBLIC_SPEC_COMMIT_URL

const navbar = (
  <Navbar logo={<b>{siteTitle}</b>}>
    {specCommit ? (
      <a
        href={specCommitUrl}
        target="_blank"
        rel="noreferrer"
        title={`Built from tc39/ecma262@${specCommit}`}
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.8em',
          color: 'var(--x-color-gray-500, #6b7280)',
        }}
      >
        {specCommit}
      </a>
    ) : null}
  </Navbar>
)
const editions = JSON.parse(process.env.NEXT_PUBLIC_EDITIONS || '[]')
const deployBase = process.env.NEXT_PUBLIC_DEPLOY_BASE || '/'

const footer = (
  <Footer>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
      <b>ECMA-262 editions</b>
      {editions.map((e) => (
        <span key={e.id}>
          <a
            href={`${deployBase}${e.id}/`}
            style={e.title === siteTitle ? { fontWeight: 600 } : undefined}
          >
            {e.title}
          </a>
          {e.source ? (
            <>
              {' '}
              <a
                href={e.source.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '0.8em',
                  color: 'var(--x-color-gray-500, #6b7280)',
                }}
              >
                {e.source.short}
              </a>
            </>
          ) : null}
        </span>
      ))}
      <span style={{ marginTop: '0.5rem', color: 'var(--x-color-gray-500, #6b7280)' }}>
        MIT {new Date().getFullYear()} © ecma262.
      </span>
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
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
