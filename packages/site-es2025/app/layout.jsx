import { SpecLayout } from "shared/components/spec-layout";

// `siteTitle` is read literally by scripts/editions.mjs; keep it inline.
const siteTitle = "ECMA-262, 16th, ES2025";

export const metadata = {
  title: siteTitle,
  description: "The ECMAScript 2025 Language Specification, 16th edition.",
};

export default function RootLayout({ children }) {
  return <SpecLayout siteTitle={siteTitle}>{children}</SpecLayout>;
}
