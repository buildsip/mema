import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { getDatabaseUrl } from "./get-database-url";

/**
 * Runs an operation and closes its database connection, even when the operation fails.
 * The callback keeps cleanup here so callers cannot forget to close the connection.
 * Driver errors are replaced with recovery instructions to keep credentials private.
 */
export async function withDatabase<T>({
  repo,
  command,
  run,
}: {
  repo: string;
  command: string;
  run: (db: NodePgDatabase) => Promise<T>;
}): Promise<T> {
  const url = await getDatabaseUrl({ repo, command });
  let client: Client | undefined;
  try {
    client = new Client({
      connectionString: url,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 30_000,
      application_name: "mema",
    });
    client.on("error", () => {});
    await client.connect();
    // Operations never migrate implicitly. Init owns schema changes and their locks.
    return await run(drizzle(client));
  } catch {
    throw new Error(
      `The memory database operation failed for ${repo}. Check that prune.databaseUrlCommand prints a reachable PostgreSQL URL and its role can SELECT and INSERT in mema.upvotes. Run mema init from ${repo} if the schema is missing or outdated, then retry. Check database server logs for connection, permission, or query failures.`,
    );
  } finally {
    await client?.end().catch(() => {});
  }
}
