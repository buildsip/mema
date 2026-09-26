import { statIfExists } from "@buildsip/file-utils";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { isPackageManifest } from "./is-package-manifest";

/** Checks only direct children, so a nested package cannot turn its parent into a package. */
export async function hasPackageManifest(path: string): Promise<boolean> {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    // Ancestor searches start at file scopes and can include paths deleted since
    // a memory was saved. Neither case describes an existing package directory.
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return false;
    throw error;
  }
  for (const entry of entries) {
    if (!isPackageManifest(entry.name)) continue;
    if (entry.isFile()) return true;
    // Preserve the existing package.json behavior for symlinks to actual files.
    // Directories and dangling symlinks named like manifests do not count.
    if (
      entry.isSymbolicLink() &&
      (await statIfExists({ path: join(path, entry.name) }))?.isFile()
    ) {
      return true;
    }
  }
  return false;
}
