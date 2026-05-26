import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './ecma-spec.css'

const siteTitle = 'ECMA-262, 17th, ES2026'

export const metadata = {
  title: siteTitle,
  description: 'The ECMAScript 2026 Language Specification, 17th edition.'
}

const navbar = <Navbar logo={<b>{siteTitle}</b>} />
const footer = <Footer>MIT {new Date().getFullYear()} © cool262.</Footer>

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          footer={footer}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/kt3k/cool262/tree/main"
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
