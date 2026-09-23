import type { Command } from "commander";
import { dirname, isAbsolute } from "node:path";
import { CLI_NAME } from "../cli-name";
import { createdMillis } from "../created-date";
import { findStores } from "../find-stores";
import { loadMemories } from "../load-memories";
import { readPruneConfig } from "../read-prune-config";
import { readUpvotes } from "../read-upvotes";
import { resolveGitRoot } from "../resolve-git-root";

/** Lists expired, unprotected directories for user-requested review; never deletes anything. */
export async function prune({ repo }: { repo: string }) {
  if (!isAbsolute(repo) || repo.includes("\0")) {
    throw new Error(
      "Provide repo as an absolute path to the project's Git root without NUL characters.",
    );
  }
  const owner = await resolveGitRoot(repo);
  const config = await readPruneConfig(owner);
  if (!config) {
    throw new Error(
      `Pruning is disabled in ${owner}. Ask the user to run ${CLI_NAME} init from this repository's Git root to enable pruning, then retry.`,
    );
  }
  // Include this repository's root and package stores, regardless of memory scopes.
  const { stores } = await findStores({ repo: owner, project: owner });
  const memories = (await loadMemories({ stores, repo: owner })).filter(
    (memory) => !memory.frontmatter.doNotDelete,
  );
  const now = Date.now();
  const candidates: string[] = [];
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
  return candidates.sort((a, b) => a.localeCompare(b));
}

/** Registers the CLI equivalent of prune-memories with no scope or result cap. */
export function registerPruneCommand({ program }: { program: Command }) {
  program
    .command("prune")
    .description("List expired memories in one repository for review without deleting them.")
    .requiredOption("--repo <path>", "Absolute Git root path of the repository to prune.")
    .action(async (options: { repo: string }) => {
      process.stdout.write(`${JSON.stringify(await prune(options), null, 2)}\n`);
    });
}
