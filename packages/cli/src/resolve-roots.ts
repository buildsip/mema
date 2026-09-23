import { realpath, stat } from "node:fs/promises";
import { resolve } from "node:path";

/** Canonicalizes the complete workspace folder list without selecting an active repo. */
export async function resolveRoots({ roots }: { roots: string[] }) {
  if (!roots.length) {
    throw new Error("Include every workspace project root in roots; at least one is required.");
  }
  const folders = await Promise.all(
    [...new Set(roots)].map(async (root) => {
      // realpath gives aliases of the same workspace folder one stable path.
      const path = await realpath(resolve(root));
      if (!(await stat(path)).isDirectory()) {
        throw new Error(`Provide a workspace directory in roots, not a file: ${root}`);
      }
      return path;
    }),
  );
  return [...new Set(folders)];
}
