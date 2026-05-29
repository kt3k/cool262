// Chapter list for the sidebar. Mirrors packages/site-draft/content/_meta.js.
// In a real Lume migration this would be auto-emitted by build-chapters.mjs
// alongside content/*.mdx and lib/spec/*.jsx.
//
// `slug` is both the URL path segment and the (anchor-only) edit handle;
// `title` is what shows up in the sidebar label.
export interface Chapter {
  slug: string;
  title: string;
  // Optional bucket for the sidebar renderer: missing = body chapter,
  // "annex" = Annex A-F, "back" = Bibliography / Colophon. Used purely for
  // a thin divider between groups; the list order itself is what the user
  // reads.
  group?: "annex" | "back";
}

const chapters: Chapter[] = [
  { slug: "index", title: "Introduction" },
  { slug: "scope", title: "1 Scope" },
  { slug: "conformance", title: "2 Conformance" },
  { slug: "normative-references", title: "3 Normative References" },
  { slug: "overview", title: "4 Overview" },
  { slug: "notational-conventions", title: "5 Notational Conventions" },
  {
    slug: "ecmascript-data-types-and-values",
    title: "6 ECMAScript Data Types and Values",
  },
  { slug: "abstract-operations", title: "7 Abstract Operations" },
  { slug: "syntax-directed-operations", title: "8 Syntax-Directed Operations" },
  {
    slug: "executable-code-and-execution-contexts",
    title: "9 Executable Code and Execution Contexts",
  },
  {
    slug: "ordinary-and-exotic-objects-behaviours",
    title: "10 Ordinary and Exotic Objects Behaviours",
  },
  {
    slug: "ecmascript-language-source-code",
    title: "11 ECMAScript Language: Source Text",
  },
  {
    slug: "ecmascript-language-lexical-grammar",
    title: "12 ECMAScript Language: Lexical Grammar",
  },
  {
    slug: "ecmascript-language-expressions",
    title: "13 ECMAScript Language: Expressions",
  },
  {
    slug: "ecmascript-language-statements-and-declarations",
    title: "14 ECMAScript Language: Statements and Declarations",
  },
  {
    slug: "ecmascript-language-functions-and-classes",
    title: "15 ECMAScript Language: Functions and Classes",
  },
  {
    slug: "ecmascript-language-scripts-and-modules",
    title: "16 ECMAScript Language: Scripts and Modules",
  },
  {
    slug: "error-handling-and-language-extensions",
    title: "17 Error Handling and Language Extensions",
  },
  {
    slug: "ecmascript-standard-built-in-objects",
    title: "18 ECMAScript Standard Built-in Objects",
  },
  { slug: "global-object", title: "19 The Global Object" },
  { slug: "fundamental-objects", title: "20 Fundamental Objects" },
  { slug: "numbers-and-dates", title: "21 Numbers and Dates" },
  { slug: "text-processing", title: "22 Text Processing" },
  { slug: "indexed-collections", title: "23 Indexed Collections" },
  { slug: "keyed-collections", title: "24 Keyed Collections" },
  { slug: "structured-data", title: "25 Structured Data" },
  { slug: "managing-memory", title: "26 Managing Memory" },
  {
    slug: "control-abstraction-objects",
    title: "27 Control Abstraction Objects",
  },
  { slug: "reflection", title: "28 Reflection" },
  { slug: "memory-model", title: "29 Memory Model" },
  // Annexes + back-matter. `group: "annex"` lets the sidebar draw a thin
  // divider before the first annex so the section break reads visually
  // (Nextra's flat _meta.js relies on the long "Annex X (informative)"
  // prefix to imply the break; here we surface it as chrome).
  {
    slug: "grammar-summary",
    title: "Annex A (informative) Grammar Summary",
    group: "annex",
  },
  {
    slug: "additional-ecmascript-features-for-web-browsers",
    title:
      "Annex B (normative) Additional ECMAScript Features for Web Browsers",
    group: "annex",
  },
  {
    slug: "strict-mode-of-ecmascript",
    title: "Annex C (informative) The Strict Mode of ECMAScript",
    group: "annex",
  },
  {
    slug: "host-layering-points",
    title: "Annex D (informative) Host Layering Points",
    group: "annex",
  },
  {
    slug:
      "corrections-and-clarifications-in-ecmascript-2015-with-possible-compatibility-impact",
    title:
      "Annex E (informative) Corrections and Clarifications in ECMAScript 2015 with Possible Compatibility Impact",
    group: "annex",
  },
  {
    slug:
      "additions-and-changes-that-introduce-incompatibilities-with-prior-editions",
    title:
      "Annex F (informative) Additions and Changes That Introduce Incompatibilities with Prior Editions",
    group: "annex",
  },
  { slug: "bibliography", title: "Bibliography", group: "back" },
  { slug: "colophon", title: "Colophon", group: "back" },
];

export default chapters;
