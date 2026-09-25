import { copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Point local README images at GitHub so they load on npm.
 *
 * npm does not serve images out of the published tarball. This package also
 * sets `repository.directory` to `packages/cli`, so a relative `src` is looked
 * up under that folder and misses files that live at the repo root (the banner
 * is `apps/docs/public/banner.svg`, the file tree is `docs/assets/file-tree.svg`).
 * GitHub renders those same relative paths from the repo root, so only the
 * packed copy is rewritten.
 *
 * A leading `./` has to be removed. Leaving it turns the file tree into
 * `./https://...`, which is not a URL.
 */
export function rewriteImagesForNpm({ readme, repo }) {
  const rawRoot = `https://raw.githubusercontent.com/${repo}/main/`;

  return readme.replaceAll(
    /(\s(?:src|srcset)=(["']))(\.\/)?(?!https?:\/\/)([^"']+)\2/g,
    (_match, open, quote, _dot, path) => `${open}${rawRoot}${path}${quote}`,
  );
}

// Importing this file from a test must not copy or delete the packed README.
const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  const repoRoot = join(process.cwd(), "..", "..");
  const action = process.argv[2];

  if (action !== "copy" && action !== "clean") {
    throw new Error('Expected "copy" or "clean".');
  }

  const names = ["README.md", "LICENSE"];

  if (action === "clean") {
    for (const name of names) rmSync(join(process.cwd(), name), { force: true });
  } else {
    copyFileSync(join(repoRoot, "LICENSE"), join(process.cwd(), "LICENSE"));
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    const match = pkg.repository?.url?.match(/github\.com\/([^/]+\/[^/.]+)/);
    if (!match) throw new Error("package.json repository.url must be a GitHub URL.");
    const readme = rewriteImagesForNpm({
      readme: readFileSync(join(repoRoot, "README.md"), "utf8"),
      repo: match[1],
    });
    writeFileSync(join(process.cwd(), "README.md"), readme);
  }
}
