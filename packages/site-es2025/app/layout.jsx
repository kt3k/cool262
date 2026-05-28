import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";
import "shared/ecma-spec.css";
import { VersionSwitcher } from "./version-switcher";

const siteTitle = "ECMA-262, 16th, ES2025";

export const metadata = {
  title: siteTitle,
  description: "The ECMAScript 2025 Language Specification, 16th edition.",
};

const specCommit = process.env.NEXT_PUBLIC_SPEC_COMMIT;
const specCommitUrl = process.env.NEXT_PUBLIC_SPEC_COMMIT_URL;
const homeHref = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`;

// logoLink={false} lets us own the anchors inside the logo. The title links
// home; a trailing status word ("(draft)" / "candidate") is rendered without
// parentheses and links to the exact tc39/ecma262 commit.
const qualMatch = siteTitle.match(/\s+\(?(draft|candidate)\)?$/i);
const qualLink = qualMatch && specCommitUrl;
const titleMain = qualLink
  ? siteTitle.slice(0, qualMatch.index).trimEnd()
  : siteTitle;
const qualText = qualMatch ? qualMatch[1] : "";

const logo = (
  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4em" }}>
    <span>
      <a href={homeHref} style={{ color: "inherit", textDecoration: "none" }}>
        <b>{titleMain}</b>
      </a>
      {qualLink
        ? (
          <>
            {" "}
            <a
              href={specCommitUrl}
              target="_blank"
              rel="noreferrer"
              title={`Built from tc39/ecma262@${specCommit}`}
              style={{
                color: "inherit",
                textDecoration: "underline",
                textDecorationStyle: "dotted",
                textUnderlineOffset: "3px",
              }}
            >
              <b>{qualText}</b>
            </a>
          </>
        )
        : null}
    </span>
    <VersionSwitcher />
  </span>
);

const navbar = <Navbar logo={logo} logoLink={false} />;
const editions = JSON.parse(process.env.NEXT_PUBLIC_EDITIONS || "[]");
const deployBase = process.env.NEXT_PUBLIC_DEPLOY_BASE || "/";

const footer = (
  <Footer>
    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          textAlign: "left",
          gap: "0.4rem",
        }}
      >
        {editions.map((e) => (
          <a key={e.id} href={`${deployBase}${e.id}/`}>
            {e.title}
          </a>
        ))}
        <span
          style={{
            marginTop: "0.5rem",
            color: "var(--x-color-gray-500, #6b7280)",
          }}
        >
          {new Date().getFullYear()} ©{" "}
          <a
            href="https://github.com/kt3k/ecma262"
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            ECMA-262 Restyled
          </a>
        </span>
      </div>
    </div>
  </Footer>
);

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
  );
}
