// Edition list for the footer + version switcher. Mirrors
// packages/site-*/app/layout.jsx's `const siteTitle = …` values; in a real
// migration the build script would emit this so titles stay in sync with each
// site's navbar/<title> tag.
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

// The single edition this PoC renders. In Nextra each `packages/site-*/`
// fixes its own title in `app/layout.jsx`; the equivalent here is one constant
// the header / <title> / VersionSwitcher all read.
export const currentEditionId = "draft";

// Header title parts: bold main string + dotted-underline status link
// ("draft" / "candidate"). Matches the parsing in
// packages/shared/components/spec-layout.jsx so the visual hierarchy is
// identical.
const current = editions.find((e) => e.id === currentEditionId)!;
const qualMatch = current.title.match(/\s+\(?(draft|candidate)\)?$/i);
export const titleMain = qualMatch
  ? current.title.slice(0, qualMatch.index).trimEnd()
  : current.title;
export const titleQual = qualMatch ? qualMatch[1] : "";

// Where the "draft" / "candidate" badge links to. Nextra wires this to the
// exact tc39/ecma262 commit via NEXT_PUBLIC_SPEC_COMMIT_URL; for the PoC we
// fall back to the repo root.
export const specCommitUrl = "https://github.com/tc39/ecma262";

export default editions;
