import { resolveGitRoot } from "./resolve-git-root";

/** Validates every workspace Git root and deduplicates canonical paths. */
export async function resolveRoots({ roots }: { roots: string[] }) {
  if (!roots.length) {
    throw new Error("Include every workspace Git root in roots; at least one is required.");
  }
  // resolveGitRoot uses realpath so symlink aliases share one canonical path.
  const folders = await Promise.all([...new Set(roots)].map(resolveGitRoot));
  return [...new Set(folders)];
}
