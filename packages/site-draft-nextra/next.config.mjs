import path from "node:path";
import nextra from "nextra";
import { readSpecSource } from "../shared/scripts/spec-source.mjs";
import { readEditions } from "../shared/scripts/editions.mjs";

const withNextra = nextra({
  // Nextra-specific options
});

// BASE_PATH is set by the `build` script in package.json so build:chapters and
// next build agree. Local `next dev` leaves it unset → empty basePath →
// site runs at localhost:3000.
const basePath = process.env.BASE_PATH || "";

const root = path.resolve(import.meta.dirname, "../..");
const id = path.basename(import.meta.dirname).replace(/^site-/, "");

// Upstream tc39/ecma262 commit this edition was built from (shown in navbar).
const source = readSpecSource(path.join(root, "ecma262", id));

// All editions (for the footer cross-links) + the path the combined site is
// served from: parent of basePath (/ecma262/<id> → /ecma262/), or / in dev.
const editions = readEditions(root);
const deployBase = basePath
  ? basePath.split("/").slice(0, -1).join("/") + "/"
  : "/";

export default withNextra({
  output: "export",
  transpilePackages: ["shared"],
  basePath,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_SPEC_COMMIT: source?.short ?? "",
    NEXT_PUBLIC_SPEC_COMMIT_URL: source?.url ?? "",
    NEXT_PUBLIC_EDITIONS: JSON.stringify(editions),
    NEXT_PUBLIC_DEPLOY_BASE: deployBase,
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
});
