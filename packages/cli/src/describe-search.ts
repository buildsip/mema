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
    const { config } = await readConfig({ project: repo, repo });
    if (config.prune) enabled.push(repo);
  }
  if (!enabled.length) return undefined;

  return `Pruning is enabled for these repositories:\n${enabled.map((repo) => JSON.stringify(repo)).join("\n")}\nWhen a memory from one of these repositories helps produce the reply, record an agent upvote with the upvote-memories tool. Don't upvote a memory just because you read it.`;
}
