import type { Command } from "commander";
import { dirname } from "node:path";
import { loadWorkspaceMemories } from "../load-workspace-memories";
import { readPruneConfig } from "../read-prune-config";
import { recordUpvotes } from "../record-upvotes";
import { selectMemories } from "../select-memories";

/** Records eligible upvotes and reports memories whose repo has pruning disabled. */
export async function upvote({
  roots,
  repo,
  paths,
  actor,
}: {
  roots: string[];
  repo: string;
  paths: string[];
  actor: "human" | "agent";
}) {
  if (actor !== "human" && actor !== "agent")
    throw new Error(
      'Provide actor as "human" when the user asked for an upvote, or "agent" when a memory helped produce the reply.',
    );
  const workspace = await loadWorkspaceMemories({ roots, repo });
  const memories = await selectMemories({ paths, ...workspace });
  const batches = [];
  const skipped = [];
  // Check every selected root before writing; disabled pruning skips only that repo.
  for (const owner of new Set(memories.map((memory) => memory.repo))) {
    const config = await readPruneConfig(owner);
    const selected = memories.filter((memory) => memory.repo === owner);
    if (!config) {
      skipped.push({
        repo: owner,
        paths: selected.map((memory) => dirname(memory.path)),
        message: `These memories could not be upvoted because pruning is disabled in ${owner}. Tell the user these memories were skipped; retry them only after pruning is enabled for this repository.`,
      });
      continue;
    }
    batches.push({
      repo: owner,
      command: config.command,
      ids: selected.map((memory) => memory.frontmatter.id),
    });
  }
  try {
    for (const batch of batches) {
      await recordUpvotes({ ...batch, actor });
    }
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : "The upvote failed. Check the configured database and retry."} Earlier repositories may already have recorded votes. Retry the batch after fixing the failure; votes do not stack.`,
    );
  }
  // Keep the caller's path order, but report only repositories whose writes succeeded.
  const enabled = new Set(batches.map((batch) => batch.repo));
  return {
    upvoted: memories
      .filter((memory) => enabled.has(memory.repo))
      .map((memory) => dirname(memory.path)),
    skipped,
  };
}

/** Registers the CLI equivalent of upvote-memories. */
export function registerUpvoteCommand({ program }: { program: Command }) {
  program
    .command("upvote")
    .description("Record human or agent upvotes for a batch of workspace memories.")
    .requiredOption(
      "--roots <path...>",
      "Every workspace directory, including shared memory repos.",
    )
    .requiredOption("--repo <path>", "Git root of the active workspace project.")
    .requiredOption("--path <path...>", "Memory directories returned by memory commands.")
    .requiredOption(
      "--actor <actor>",
      "human for user-requested upvotes; agent for useful context.",
    )
    .action(
      async (options: {
        roots: string[];
        repo: string;
        path: string[];
        actor: "human" | "agent";
      }) => {
        const result = await upvote({ ...options, paths: options.path });
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      },
    );
}
