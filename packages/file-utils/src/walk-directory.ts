import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Yields directory entries and their paths without following symbolic links.
 * Skipped directories are not visited. Missing or unreadable directories throw.
 * The starting directory must already be resolved and checked by the caller.
 */
export async function* walkDirectory({
  path,
  skip,
}: {
  path: string;
  skip?: (entry: Dirent) => boolean;
}) {
  const dirs = [path];
  // A growing queue visits descendants without recursive function calls.
  for (const dir of dirs) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (skip?.(entry)) continue;
      const path = join(dir, entry.name);
      yield { path, entry };
      if (entry.isDirectory()) dirs.push(path);
    }
  }
}
