import { realpath, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { findRepo } from "./find-repo";

/** Resolves a repository path and rejects package directories inside that repository. */
export async function resolveGitRoot(repo: string) {
  const path = await realpath(resolve(repo)).catch((cause) => {
    throw new Error(`Provide an existing Git root directory: ${repo}.`, { cause });
  });
  if (!(await stat(path)).isDirectory()) {
    throw new Error(`Provide a Git root directory, not a file: ${path}.`);
  }
  const root = await findRepo(path).catch((cause) => {
    throw new Error(
      `Initialize a Git repository in ${path} by running git init from that directory, then retry. Tiramisu requires a Git working tree.`,
      { cause },
    );
  });
  if (path !== root) {
    throw new Error(`Use the Git root ${root} instead of its subdirectory ${path}, then retry.`);
  }
  return path;
}
