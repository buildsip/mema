import type { Command } from "commander";
import { dirname } from "node:path";
import { CLI_NAME } from "../cli-name";
import { createdMillis } from "../created-date";
import { loadWorkspaceMemories } from "../load-workspace-memories";
import { readPruneConfig } from "../read-prune-config";
import { readUpvotes } from "../read-upvotes";

/** Lists expired, unprotected directories for user-requested review; never deletes anything. */
export async function prune({ roots, repo }: { roots: string[]; repo: string }) {
  const workspace = await loadWorkspaceMemories({ roots, repo });
  const now = Date.now();
  const candidates: string[] = [];
  let enabled = false;
  for (const owner of workspace.repos) {
    const config = await readPruneConfig(owner);
    if (!config) continue;
    enabled = true;
    const memories = workspace.memories.filter(
      (memory) => memory.repo === owner && !memory.frontmatter.doNotDelete,
    );
    const votes = await readUpvotes({
      repo: owner,
      command: config.command,
      ids: memories.map((memory) => memory.frontmatter.id),
    });
    for (const memory of memories) {
      const last = votes.get(memory.frontmatter.id);
      // Each clock is independent. A later agent vote cannot shorten a human lifetime.
      const expires = Math.max(
        createdMillis(memory.frontmatter.created) + config.unvotedTtl,
        last?.human === undefined ? -Infinity : last.human + config.humanUpvoteTtl,
        last?.agent === undefined ? -Infinity : last.agent + config.agentUpvoteTtl,
      );
      if (now >= expires) candidates.push(dirname(memory.path));
    }
  }
  if (!enabled)
    throw new Error(
      `Pruning is disabled in every available repository. Ask the user to run ${CLI_NAME} init from a repository's Git root to enable pruning, then retry.`,
    );
  return candidates.sort((a, b) => a.localeCompare(b));
}

/** Registers the CLI equivalent of prune-memories with no scope or result cap. */
export function registerPruneCommand({ program }: { program: Command }) {
  program
    .command("prune")
    .description("List expired workspace memories for review without deleting them.")
    .requiredOption(
      "--roots <path...>",
      "Every workspace directory, including shared memory repos.",
    )
    .requiredOption("--repo <path>", "Git root of the active workspace project.")
    .action(async (options: { roots: string[]; repo: string }) => {
      process.stdout.write(`${JSON.stringify(await prune(options), null, 2)}\n`);
    });
}
