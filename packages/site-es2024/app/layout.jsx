import { SpecLayout } from "shared/components/spec-layout";

// `siteTitle` is read literally by scripts/editions.mjs; keep it inline.
const siteTitle = "ECMA-262, 15th, ES2024";

export const metadata = {
  title: siteTitle,
  description: "The ECMAScript 2024 Language Specification, 15th edition.",
};

export default function RootLayout({ children }) {
  return <SpecLayout siteTitle={siteTitle}>{children}</SpecLayout>;
}
