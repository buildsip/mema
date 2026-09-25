import { expect, it } from "bun:test";
import { rewriteImagesForNpm } from "./readme.mjs";

const repo = "buildsip/tiramisu";
const raw = `https://raw.githubusercontent.com/${repo}/main`;

const readme = `
<img src="apps/docs/public/banner.svg" alt="banner">
<img src="docs/assets/cursor.svg" alt="Cursor">
<source srcset="docs/assets/cursor-white.svg">
<img src="./docs/assets/file-tree.svg?v=2" alt="File tree">
<img src="https://img.shields.io/npm/v/tiramisu?logo=npm" alt="npm">
`;

it("rewrites local images to raw GitHub URLs and leaves badges alone", () => {
  const packed = rewriteImagesForNpm({ readme, repo });

  expect(packed).toContain(`<img src="${raw}/apps/docs/public/banner.svg" alt="banner">`);
  expect(packed).toContain(`<img src="${raw}/docs/assets/cursor.svg" alt="Cursor">`);
  expect(packed).toContain(`<source srcset="${raw}/docs/assets/cursor-white.svg">`);
  // The leading ./ must not survive, or npm requests "./https://...".
  expect(packed).toContain(`<img src="${raw}/docs/assets/file-tree.svg?v=2" alt="File tree">`);
  expect(packed).not.toContain("./https://");
  expect(packed).toContain(`<img src="https://img.shields.io/npm/v/tiramisu?logo=npm" alt="npm">`);
});
