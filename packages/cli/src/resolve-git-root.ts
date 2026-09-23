import { realpath, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { findRepo } from "./find-repo";

/** Resolves a repository path and rejects package directories inside that repository. */
export async function resolveGitRoot(repo: string) {
  const path = await realpath(resolve(repo)).catch((cause) => {
    throw new Error(`Provide an existing Git root directory for repo: ${repo}.`, { cause });
  });
  if (!(await stat(path)).isDirectory()) {
    throw new Error("Provide a directory for repo, not a file.");
  }
  const root = await findRepo(path).catch((cause) => {
    throw new Error(`Set repo to the Git root of an existing Git working tree: ${repo}.`, {
      cause,
    });
  });
  if (path !== root) {
    throw new Error("Set repo to the Git root of the project, not a directory inside it.");
  }
  return path;
}
