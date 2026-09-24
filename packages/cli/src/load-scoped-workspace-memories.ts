import { relativePosix } from "@buildsip/file-utils";
import { findStores } from "./find-stores";
import { loadMemories } from "./load-memories";
import { matchesScope } from "./matches-scope";
import { normalizeScopes } from "./normalize-scopes";
import { readConfig } from "./read-config";
import { resolveRepo } from "./resolve-repo";
import { validateScopes } from "./validate-scopes";

/**
 * Loads scoped memories from the active repo plus shared workspace memories.
 * A scope of * includes the entire active repo; other repos still need availableToWorkspace.
 */
export async function loadScopedWorkspaceMemories({
  roots,
  repo,
  scope = ["*"],
}: {
  roots: string[];
  repo: string;
  scope?: string[];
}) {
  const workspace = await resolveRepo({ roots, repo });
  const scopes = await validateScopes({ repo: workspace.repo, scope });
  const { stores } = await findStores({ repo: workspace.repo, project: workspace.repo, scopes });
  const local = await loadMemories({ stores, repo: workspace.repo });
  const memories = local.filter((memory) => {
    if (scopes.some((value) => ["*", "."].includes(value))) return true;
    // An omitted memory scope applies to its owner; parent scopes also match child files.
    const owner = relativePosix({ from: workspace.repo, to: memory.project }) || ".";
    const appliesTo = normalizeScopes(memory.frontmatter.scope ?? [owner]);
    return scopes.some((path) =>
      appliesTo.some(
        (scope) => matchesScope({ scope, path }) || matchesScope({ scope: path, path: scope }),
      ),
    );
  });
  const repos = new Set([workspace.repo]);
  for (const other of workspace.roots) {
    if (other === workspace.repo) continue;
    const { availableToWorkspace } = await readConfig(other);
    // Each validated root exposes stores from its entire repository.
    const { stores } = await findStores({ repo: other, project: other });
    memories.push(...(await loadMemories({ stores, repo: other, availableToWorkspaceOnly: true })));
    if (availableToWorkspace) repos.add(other);
  }
  return {
    repos: [...repos],
    memories: [...new Map(memories.map((memory) => [memory.path, memory])).values()].sort((a, b) =>
      a.path.localeCompare(b.path),
    ),
  };
}
