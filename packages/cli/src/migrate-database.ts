import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { CLI_NAME } from "./cli-name";
import { normalizeDatabaseUrl } from "./normalize-database-url";

/** Marks our actionable errors so raw driver errors never expose connection details. */
class MigrationError extends Error {}

/**
 * Applies packaged migrations once per database, independently of repository config versions.
 * Use a direct or session-pooled connection: the lock must stay on this PostgreSQL session.
 */
export async function migrateDatabase({
  url,
  migrationsFolder,
}: {
  url: string;
  migrationsFolder: string;
}) {
  let client: Client | undefined;
  try {
    // Construct inside the try as malformed TLS options can fail before connect().
    client = new Client({
      connectionString: normalizeDatabaseUrl(url),
      connectionTimeoutMillis: 10_000,
      statement_timeout: 30_000,
      application_name: "tiramisu-init",
    });
    // Query promises report connection failures; don't log an idle error containing credentials.
    client.on("error", () => {});
    const migrations = readMigrationFiles({ migrationsFolder });
    if (!migrations.length) {
      throw new MigrationError(
        `No bundled database migrations were found. Reinstall tiramisu and retry ${CLI_NAME} init.`,
      );
    }
    await client.connect();
    // A dedicated client holds this database-local lock until finally closes its connection.
    // Acquire it before checking history, so another init cannot pass the same stale check.
    await client.query("SELECT pg_advisory_lock(1835363681, 1)");
    const schema = await client.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'tiramisu') AS exists",
    );
    let applied = 0;
    if (schema.rows[0]!.exists) {
      const journal = await client.query<{ name: string | null }>(
        "SELECT to_regclass('tiramisu.__drizzle_migrations')::text AS name",
      );
      if (!journal.rows[0]!.name) {
        throw new MigrationError(
          `The tiramisu database schema exists without its migration history. No migrations were applied. Restore its original tiramisu.__drizzle_migrations table from backup, or configure a different database with no tiramisu schema, then retry ${CLI_NAME} init. Do not delete existing tables to bypass this check.`,
        );
      }
      const history = await client.query<{ hash: string; created_at: string }>(
        "SELECT hash, created_at FROM tiramisu.__drizzle_migrations ORDER BY created_at, id",
      );
      // Drizzle skips by timestamp. Validate the full prefix first to reject newer or edited history.
      for (const [i, entry] of history.rows.entries()) {
        const expected = migrations[i];
        if (
          !expected ||
          expected.hash !== entry.hash ||
          expected.folderMillis !== Number(entry.created_at)
        ) {
          throw new MigrationError(
            `The database migration history does not match this tiramisu release; it may be newer or modified. No migrations were applied. Use the tiramisu release that owns this history or a compatible newer release, then retry ${CLI_NAME} init. Do not edit the migration history or config.json version to bypass this check.`,
          );
        }
      }
      applied = history.rows.length;
      if (!applied) {
        // Drizzle creates its journal before the migration transaction. An empty journal alone
        // is safe to retry after failure; existing application objects must not be adopted.
        const objects = await client.query(
          "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'tiramisu' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f') AND c.relname NOT IN ('__drizzle_migrations', '__drizzle_migrations_id_seq') LIMIT 1",
        );
        if (objects.rows.length) {
          throw new MigrationError(
            `The tiramisu schema has existing objects but no applied migration records. No migrations were applied. Restore the original migration history or configure a different database with no tiramisu schema, then retry ${CLI_NAME} init.`,
          );
        }
      }
    }
    if (applied < migrations.length) {
      // Drizzle applies pending SQL and records its history in one transaction.
      await migrate(drizzle(client), {
        migrationsFolder,
        migrationsSchema: "tiramisu",
        migrationsTable: "__drizzle_migrations",
      });
    }
    return { applied: migrations.length - applied };
  } catch (error) {
    if (error instanceof MigrationError) throw error;
    // Never forward driver messages, SQL parameters, or the URL to an agent response.
    throw new Error(
      `Database setup failed. Check that the credential command returns a reachable direct or session-pooled PostgreSQL URL and that its database role can create and alter objects in the tiramisu schema. Check the database server logs for connection, permission, or SQL failures; another setup may hold the migration lock. Retry ${CLI_NAME} init after fixing the cause. Pending migrations are transactional; existing votes are not reset. Connection details are hidden to protect credentials.`,
    );
  } finally {
    // Closing also releases the advisory lock on success, failure, and a no-op migration.
    await client?.end().catch(() => {});
  }
}
