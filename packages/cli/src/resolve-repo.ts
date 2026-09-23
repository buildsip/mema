import { isInside } from "@buildsip/file-utils";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveGitRoot } from "./resolve-git-root";
import { resolveRoots } from "./resolve-roots";

type Workspace = {
  roots: string[];
  repo: string;
};

/**
 * Canonicalizes workspace folders and the Git root the agent is working on.
 *
 * @param roots - Paths to workspace projects
 * @param repo - Path to repo
 *
 * @returns Canonicalized paths
 */
export async function resolveRepo({
  roots,
  repo,
}: {
  roots: string[];
  repo: string;
}): Promise<Workspace> {
  if (!roots.length || !repo.trim()) {
    throw new Error("roots and repo are required.");
  }
  const folders = await resolveRoots({ roots });
  const path = await realpath(resolve(repo));
  if (!folders.some((root) => isInside({ path, parent: root }))) {
    throw new Error("repo must be inside one of the workspace roots.");
  }
  await resolveGitRoot(path);
  return { roots: folders, repo: path };
}
