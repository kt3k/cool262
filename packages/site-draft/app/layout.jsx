import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './ecma-spec.css'

const siteTitle = 'ECMA-262, 18th, ES2027 (draft)'

export const metadata = {
  title: siteTitle,
  description: 'The ECMAScript Language Specification, editor\'s draft toward 18th edition / ES2027.'
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
const footer = <Footer>MIT {new Date().getFullYear()} © ecma262.</Footer>

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
