// Generated from ecma262/spec.html — do not edit by hand.
const _sections = {"":"<p>This specification is authored on <a href=\"https://github.com/tc39/ecma262\">GitHub</a> in a plaintext source format called <a href=\"https://github.com/bterlson/ecmarkup\">Ecmarkup</a>. Ecmarkup is an HTML and Markdown dialect that provides a framework and toolset for authoring Ecma specifications in plaintext and processing the specification into a full-featured HTML rendering that follows the editorial conventions for this document. Ecmarkup builds on and integrates a number of other formats and technologies including <a href=\"https://github.com/rbuckton/grammarkdown\">Grammarkdown</a> for defining syntax and <a href=\"https://github.com/domenic/ecmarkdown\">Ecmarkdown</a> for authoring algorithm steps. PDF renderings of this specification are produced using a print stylesheet which takes advantage of the CSS Paged Media specification and is converted using <a href=\"https://www.princexml.com/\">PrinceXML</a>.</p>\n  <p>Prior editions of this specification were authored using Word—the Ecmarkup source text that formed the basis of this edition was produced by converting the ECMAScript 2015 Word document to Ecmarkup using an automated conversion tool.</p>"};
const _basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const sections = _basePath
  ? Object.fromEntries(
      Object.entries(_sections).map(([k, v]) => [
        k,
        v.replaceAll('href="/', `href="${_basePath}/`),
      ])
    )
  : _sections;
export function Sec({ id }) {
  const html = sections[id] ?? '';
  return <div className="ecma-spec" dangerouslySetInnerHTML={{ __html: html }} />;
}
