import { useMDXComponents as getThemeComponents } from "nextra-theme-docs";

const themeComponents = getThemeComponents();

// Aliasing h2–h6 to the theme's h1 component lets the markdown source use
// depth-based `##`/`###`/etc. (so Nextra's compile-time TOC plugin can scan
// h2/h3 and build the right-rail outline) while the rendered DOM has only
// <h1>s — matching tc39.es/ecma262's structural choice. Depth-based sizing
// is restored in ecma-spec.css via `.ecma-spec emu-clause emu-clause > h1`.
const h1AsH1 = themeComponents.h1;
const flattenHeadings = {
  h2: h1AsH1,
  h3: h1AsH1,
  h4: h1AsH1,
  h5: h1AsH1,
  h6: h1AsH1,
};

export function useMDXComponents(components) {
  return {
    ...themeComponents,
    ...flattenHeadings,
    ...components,
  };
}
