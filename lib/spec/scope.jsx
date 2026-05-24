// Generated from ecma262/spec.html — do not edit by hand.
const _sections = {"":"<p>This Standard defines the ECMAScript 2027 general-purpose programming language.</p>"};
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
