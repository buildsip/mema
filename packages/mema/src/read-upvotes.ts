import { inArray, max } from "drizzle-orm";
import { upvotes } from "./upvotes";
import { withDatabase } from "./with-database";

/** Loads only the last event for each actor; repeated upvotes never accumulate time. */
export async function readUpvotes({
  repo,
  command,
  ids,
}: {
  repo: string;
  command: string;
  ids: string[];
}) {
  return withDatabase({
    repo,
    command,
    run: async (db) => {
      const votes = new Map<string, { human?: number; agent?: number }>();
      const unique = [...new Set(ids)];
      // Query even an empty selection so broken enabled databases fail the whole prune call.
      for (let offset = 0; offset < Math.max(unique.length, 1); offset += 1000) {
        const rows = await db
          .select({ memoryId: upvotes.memoryId, actor: upvotes.actor, at: max(upvotes.createdAt) })
          .from(upvotes)
          .where(inArray(upvotes.memoryId, unique.slice(offset, offset + 1000)))
          .groupBy(upvotes.memoryId, upvotes.actor);
        for (const row of rows) {
          if (!row.at) continue;
          const last = votes.get(row.memoryId) ?? {};
          last[row.actor] = new Date(row.at).getTime();
          votes.set(row.memoryId, last);
        }
      }
      return votes;
    },
  });
}
