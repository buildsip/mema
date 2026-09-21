import { randomUUID } from "node:crypto";
import { upvotes } from "./upvotes";
import { withDatabase } from "./with-database";

/** Records one event per ID, atomically within this repository's database. */
export async function recordUpvotes({
  repo,
  command,
  ids,
  actor,
}: {
  repo: string;
  command: string;
  ids: string[];
  actor: "human" | "agent";
}) {
  const unique = [...new Set(ids)];
  await withDatabase({
    repo,
    command,
    run: (db) =>
      db.transaction(async (tx) => {
        // Bound SQL parameters without imposing a limit on the public batch size.
        for (let offset = 0; offset < unique.length; offset += 1000) {
          await tx.insert(upvotes).values(
            unique.slice(offset, offset + 1000).map((memoryId) => ({
              id: randomUUID(),
              memoryId,
              actor,
            })),
          );
        }
      }),
  });
}
