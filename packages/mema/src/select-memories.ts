import { isInside } from "@buildsip/file-utils";
import { resolve } from "node:path";
import type { Memory } from "./memory";
import { resolveMemoryFile } from "./resolve-memory-file";
import { NAMES } from "./names";

/** Validates a complete mixed-repo selection before any file or database write. */
export async function selectMemories({
  paths,
  memories,
  repos,
}: {
  paths: string[];
  memories: Memory[];
  repos: string[];
}) {
  if (!paths.length) throw new Error("Provide at least one memory directory path.");
  const byPath = new Map(memories.map((memory) => [memory.path, memory]));
  const selected = new Map<string, Memory>();
  for (const input of paths) {
    if (typeof input !== "string" || !input.trim() || input.includes("\0")) {
      throw new Error("Provide a nonempty memory directory path without NUL characters.");
    }
    // Check the most specific repo first when roots contain nested Git repositories.
    const repo = [...repos]
      .sort((a, b) => b.length - a.length)
      .find((repo) => isInside({ path: resolve(input), parent: repo }));
    if (!repo)
      throw new Error(
        `This path is outside the memories available to this workspace: ${input}. Search again with every workspace folder in roots and use a returned memory directory.`,
      );
    const path = await resolveMemoryFile({ path: input, repo });
    const memory = byPath.get(path);
    if (!memory)
      throw new Error(
        `Choose a memory directory returned by search-memories for these roots and repo: ${input}. Only repo and package ${NAMES.MEMORIES}/${NAMES.DATA} stores are supported.`,
      );
    selected.set(path, memory);
  }
  return [...selected.values()];
}
