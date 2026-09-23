import { assertNoSymlinks, lstatIfExists, walkDirectory } from "@buildsip/file-utils";
import { join } from "node:path";
import type { Memory } from "./memory";
import { NAMES } from "./names";
import { readConfig } from "./read-config";
import { readMemory } from "./read-memory";

/**
 * Loads memory.md files beneath each store's .memories/data directory.
 * Missing data directories are empty stores; temporary memory directories are skipped.
 *
 * `availableToWorkspaceOnly` includes stores only when their repo root sets
 * `availableToWorkspace` to true.
 * Reads validate built-in fields while preserving custom fields from older schemas.
 */
export async function loadMemories({
  stores,
  repo,
  availableToWorkspaceOnly = false,
}: {
  stores: string[];
  repo: string;
  availableToWorkspaceOnly?: boolean;
}) {
  const memories: Memory[] = [];
  // Sharing is repository-wide, so read it once for all package stores.
  const { availableToWorkspace } = await readConfig(repo);
  if (availableToWorkspaceOnly && !availableToWorkspace) return memories;
  for (const project of stores) {
    const data = join(project, NAMES.MEMORIES, NAMES.DATA);
    await assertNoSymlinks({ path: data, base: repo });
    if (!(await lstatIfExists({ path: data }))) continue;
    const files: string[] = [];
    for await (const { path, entry } of walkDirectory({
      path: data,
      skip: (entry) => entry.isDirectory() && entry.name.startsWith(NAMES.MEM_PREFIX),
    })) {
      if (entry.isFile() && entry.name === NAMES.MEMORY_MD) files.push(path);
    }
    files.sort();
    // Bound open file handles even when a store contains thousands of memories.
    for (let offset = 0; offset < files.length; offset += 50) {
      memories.push(
        ...(await Promise.all(
          files.slice(offset, offset + 50).map((path) =>
            readMemory({
              path,
              project,
              repo,
            }),
          ),
        )),
      );
    }
  }
  return memories;
}
