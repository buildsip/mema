import { walkDirectory } from "@buildsip/file-utils";
import { dirname } from "node:path";
import { NAMES } from "./names";

/**
 * Finds memory directories below a selected parent without parsing their contents.
 * Even a malformed or temporary nested memory must not be deleted accidentally.
 * Symbolic link directories are not followed; removing the parent only removes those links.
 */
export async function findNestedMemories(path: string) {
  const memories: string[] = [];
  for await (const { path: child, entry } of walkDirectory({ path })) {
    if (dirname(child) !== path && !entry.isDirectory() && entry.name === NAMES.MEMORY_MD)
      memories.push(dirname(child));
  }
  return memories;
}
