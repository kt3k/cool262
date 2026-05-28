import { notFound } from "next/navigation";
import { generateStaticParamsFor, importPage } from "nextra/pages";
import { useMDXComponents as getMDXComponents } from "../../mdx-components.jsx";

export const generateStaticParams = generateStaticParamsFor("mdxPath");

// Wrap importPage so a missing page renders the not-found UI instead of
// surfacing the raw "Cannot find module" error.
async function safeImportPage(mdxPath) {
  try {
    return await importPage(mdxPath);
  } catch (err) {
    if (err?.code === "MODULE_NOT_FOUND") notFound();
    throw err;
  }
}

export async function generateMetadata(props) {
  const params = await props.params;
  const { metadata } = await safeImportPage(params.mdxPath);
  return metadata;
}

const Wrapper = getMDXComponents().wrapper;

export default async function Page(props) {
  const params = await props.params;
  const result = await safeImportPage(params.mdxPath);
  const { default: MDXContent, toc, metadata } = result;
  return (
    <Wrapper toc={toc} metadata={metadata}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
