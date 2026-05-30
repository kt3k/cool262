import { SpecLayout } from "shared/components/spec-layout";

// `siteTitle` is read literally by scripts/editions.mjs; keep it inline.
const siteTitle = "ECMA-262, 18th, ES2027 draft (Nextra)";

export const metadata = {
  title: siteTitle,
  description:
    "The ECMAScript Language Specification, editor's draft toward 18th edition / ES2027.",
};

export default function RootLayout({ children }) {
  return <SpecLayout siteTitle={siteTitle}>{children}</SpecLayout>;
}
