import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata = {
  title: 'cool262',
  description: 'A Nextra-powered site'
}

const navbar = <Navbar logo={<b>cool262</b>} />
const footer = <Footer>MIT {new Date().getFullYear()} © cool262.</Footer>

export default async function RootLayout({ children }) {
  return (
    <html lang="ja" dir="ltr" suppressHydrationWarning>
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
