import { join } from "node:path";
import { NAMES } from "./names";
import { parseDays } from "./parse-days";
import { readConfig } from "./read-config";

/** Resolves root-only pruning settings; omission and false both disable database use. */
export async function readPruneConfig(repo: string) {
  const { config } = await readConfig({ project: repo, repo });
  if (!config.prune) return undefined;
  if (!config.prune.databaseUrlCommand) {
    throw new Error(
      `Set prune.databaseUrlCommand in ${join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON)} to a shell command that prints one PostgreSQL URL, then run mema init from ${repo} to initialize the database and retry.`,
    );
  }
  return {
    command: config.prune.databaseUrlCommand,
    unvotedTtl: parseDays(config.prune.unvotedTtl ?? "90d"),
    humanUpvoteTtl: parseDays(config.prune.humanUpvoteTtl ?? "180d"),
    agentUpvoteTtl: parseDays(config.prune.agentUpvoteTtl ?? "90d"),
  };
}
