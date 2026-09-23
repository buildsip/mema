import { findRepo } from "./find-repo";
import { readConfig } from "./read-config";

/** Lists each repository with pruning enabled once, alongside the upvote guidance. */
export async function describeSearch(result: { path: string }[]) {
  const repos = new Set<string>();
  const enabled: string[] = [];
  for (const { path } of result) {
    const repo = await findRepo(path);
    if (repos.has(repo)) continue;
    repos.add(repo);
    // Read each root config once; search must not run database credential commands.
    const { config } = await readConfig(repo);
    if (config.prune) enabled.push(repo);
  }
  if (!enabled.length) return undefined;

  return `If you encounter a memory that contradicts the code or another memory, tell the user and offer to update or delete it.
  Pruning is enabled for these repositories:
  ${enabled.map((repo) => JSON.stringify(repo)).join("\n")}
  If one of these memories helps produce the reply, record an upvote with \`actor\` \`agent\` with the \`upvote-memories\` tool. Don't upvote a memory just because you read it.`;
}
