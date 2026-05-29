// Edition list for the footer. Mirrors packages/site-*/app/layout.jsx's
// `const siteTitle = …` values; in a real migration the build script would
// emit this so titles stay in sync with each site's navbar/<title> tag.
//
// Order: draft first (the one we work against), then descending year — same
// sort `packages/shared/scripts/editions.mjs` applies.
export interface Edition {
  id: string;
  title: string;
}

const editions: Edition[] = [
  { id: "draft", title: "ECMA-262, 18th, ES2027 draft" },
  { id: "es2026", title: "ECMA-262, 17th, ES2026 candidate" },
  { id: "es2025", title: "ECMA-262, 16th, ES2025" },
  { id: "es2024", title: "ECMA-262, 15th, ES2024" },
];

export default editions;
