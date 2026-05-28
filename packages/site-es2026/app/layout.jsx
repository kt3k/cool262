import { SpecLayout } from "shared/components/spec-layout";

// `siteTitle` is read literally by scripts/editions.mjs; keep it inline.
const siteTitle = "ECMA-262, 17th, ES2026 candidate";

export const metadata = {
  title: siteTitle,
  description:
    "The ECMAScript 2026 Language Specification, 17th edition (candidate, awaiting June 2026 approval).",
};

export default function RootLayout({ children }) {
  return <SpecLayout siteTitle={siteTitle}>{children}</SpecLayout>;
}
