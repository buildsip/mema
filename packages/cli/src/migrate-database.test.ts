import { startDatabase } from "./test/start-database";
import { randomUUID } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { migrateDatabase } from "./migrate-database";
import { upvotes } from "./upvotes";

let temp: string;
let close: (() => Promise<void>) | undefined;
let client: Client;
let url: string;
const migrationsFolder = fileURLToPath(new URL("../dist/migrations", import.meta.url));

beforeAll(async () => {
  temp = await mkdtemp(join(tmpdir(), "tiramisu-postgres-"));
  const database = await startDatabase(temp);
  client = database.client;
  url = database.url;
  close = database.close;
}, 30_000);

beforeEach(async () => {
  await client.query("DROP SCHEMA IF EXISTS tiramisu CASCADE");
});

afterAll(async () => {
  await close?.();
  if (temp) await rm(temp, { recursive: true, force: true });
}, 30_000);

/** Writes a test-only next release without editing the migration files shipped by Tiramisu. */
async function nextRelease(sql: string) {
  const folder = await mkdtemp(join(temp, "release-"));
  await cp(migrationsFolder, folder, { recursive: true });
  const path = join(folder, "meta", "_journal.json");
  const journal = JSON.parse(await readFile(path, "utf8"));
  const last = journal.entries.at(-1);
  journal.entries.push({ ...last, idx: last.idx + 1, when: last.when + 1, tag: "next" });
  await writeFile(path, JSON.stringify(journal));
  await writeFile(join(folder, "next.sql"), sql);
  return folder;
}

it("ships the exact source migrations in the built package", () => {
  expect(readMigrationFiles({ migrationsFolder })).toEqual(
    readMigrationFiles({
      migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)),
    }),
  );
});

it("migrates once and preserves votes when another repo initializes the same database", async () => {
  expect(await migrateDatabase({ url, migrationsFolder })).toEqual({ applied: 1 });
  const db = drizzle(client);
  const id = randomUUID();
  // Legacy string IDs remain valid; event IDs are UUIDs and actor values are constrained.
  await db.insert(upvotes).values({ id, memoryId: "existing-memory", actor: "human" });
  const before = await db.select().from(upvotes);
  expect(before[0]!.createdAt).toBeInstanceOf(Date);
  expect(await migrateDatabase({ url, migrationsFolder })).toEqual({ applied: 0 });
  expect(await db.select().from(upvotes)).toEqual(before);
  await expect(
    db.insert(upvotes).values({ id, memoryId: "existing-memory", actor: "agent" }),
  ).rejects.toThrow();
  await expect(
    client.query("INSERT INTO tiramisu.upvotes (id, memory_id, actor) VALUES ($1, 'memory', 'robot')", [
      randomUUID(),
    ]),
  ).rejects.toThrow();
  expect((await client.query("SELECT * FROM tiramisu.__drizzle_migrations")).rowCount).toBe(1);
});

it("serializes concurrent initialization across separate connections", async () => {
  const results = await Promise.all(
    Array.from({ length: 4 }, () => migrateDatabase({ url, migrationsFolder })),
  );
  expect(results.map((result) => result.applied).sort()).toEqual([0, 0, 0, 1]);
  expect((await client.query("SELECT * FROM tiramisu.__drizzle_migrations")).rowCount).toBe(1);
});

it("applies only a new migration on a populated database and refuses an older client afterward", async () => {
  await migrateDatabase({ url, migrationsFolder });
  await drizzle(client)
    .insert(upvotes)
    .values({ id: randomUUID(), memoryId: "memory", actor: "agent" });
  const before = (await client.query("SELECT * FROM tiramisu.upvotes")).rows;
  const folder = await nextRelease("ALTER TABLE tiramisu.upvotes ADD COLUMN note text;");
  expect(await migrateDatabase({ url, migrationsFolder: folder })).toEqual({ applied: 1 });
  expect(
    (await client.query("SELECT id, memory_id, actor, created_at FROM tiramisu.upvotes")).rows,
  ).toEqual(before);
  expect(await migrateDatabase({ url, migrationsFolder: folder })).toEqual({ applied: 0 });
  await expect(migrateDatabase({ url, migrationsFolder })).rejects.toThrow(
    "history does not match",
  );
  expect((await client.query("SELECT * FROM tiramisu.__drizzle_migrations")).rowCount).toBe(2);
});

it("rolls back failed pending SQL and its history without losing existing votes", async () => {
  await migrateDatabase({ url, migrationsFolder });
  await drizzle(client)
    .insert(upvotes)
    .values({ id: randomUUID(), memoryId: "memory", actor: "human" });
  const before = (await client.query("SELECT * FROM tiramisu.upvotes")).rows;
  const folder = await nextRelease(
    "CREATE TABLE tiramisu.partial (id integer);\n--> statement-breakpoint\nSELECT missing_column FROM tiramisu.upvotes;",
  );
  await expect(migrateDatabase({ url, migrationsFolder: folder })).rejects.toThrow(
    "Database setup failed",
  );
  expect((await client.query("SELECT * FROM tiramisu.upvotes")).rows).toEqual(before);
  expect(
    (await client.query("SELECT to_regclass('tiramisu.partial') AS name")).rows[0].name,
  ).toBeNull();
  expect((await client.query("SELECT * FROM tiramisu.__drizzle_migrations")).rowCount).toBe(1);
  // Failed attempts release the lock, so the installed release can still initialize normally.
  expect(await migrateDatabase({ url, migrationsFolder })).toEqual({ applied: 0 });
});

it("refuses an existing schema without migration history, regardless of its data", async () => {
  await client.query(
    "CREATE SCHEMA tiramisu; CREATE TABLE tiramisu.keep (value text); INSERT INTO tiramisu.keep VALUES ('keep')",
  );
  await expect(migrateDatabase({ url, migrationsFolder })).rejects.toThrow(
    "without its migration history",
  );
  expect((await client.query("SELECT * FROM tiramisu.keep")).rows).toEqual([{ value: "keep" }]);
  expect(
    (await client.query("SELECT to_regclass('tiramisu.upvotes') AS name")).rows[0].name,
  ).toBeNull();
});

it("refuses edited migration history without modifying it", async () => {
  await migrateDatabase({ url, migrationsFolder });
  await client.query("UPDATE tiramisu.__drizzle_migrations SET hash = 'modified'");
  await expect(migrateDatabase({ url, migrationsFolder })).rejects.toThrow(
    "history does not match",
  );
  expect((await client.query("SELECT hash FROM tiramisu.__drizzle_migrations")).rows).toEqual([
    { hash: "modified" },
  ]);
});

it("leaves other applications' tables and migration history untouched", async () => {
  await client.query(
    "CREATE SCHEMA other_app; CREATE TABLE other_app.__drizzle_migrations (value text); INSERT INTO other_app.__drizzle_migrations VALUES ('keep')",
  );
  await migrateDatabase({ url, migrationsFolder });
  expect((await client.query("SELECT * FROM other_app.__drizzle_migrations")).rows).toEqual([
    { value: "keep" },
  ]);
});

it("does not expose credentials or TLS paths when constructing the connection fails", async () => {
  const result = migrateDatabase({
    url: `${url}?sslcert=/nonexistent/PRIVATE-SECRET.pem`,
    migrationsFolder,
  });
  await expect(result).rejects.toThrow("Database setup failed");
  await expect(result).rejects.not.toThrow("PRIVATE-SECRET");
});

it("can retry a failed first migration while rejecting untracked objects beside an empty journal", async () => {
  const folder = await mkdtemp(join(temp, "failed-first-"));
  await cp(migrationsFolder, folder, { recursive: true });
  const journal = JSON.parse(await readFile(join(folder, "meta", "_journal.json"), "utf8"));
  await writeFile(join(folder, `${journal.entries[0].tag}.sql`), "SELECT missing_column;");
  await expect(migrateDatabase({ url, migrationsFolder: folder })).rejects.toThrow(
    "Database setup failed",
  );
  expect((await client.query("SELECT * FROM tiramisu.__drizzle_migrations")).rowCount).toBe(0);
  await client.query("CREATE TABLE tiramisu.untracked (id integer)");
  await expect(migrateDatabase({ url, migrationsFolder })).rejects.toThrow("existing objects");
  await client.query("DROP TABLE tiramisu.untracked");
  expect(await migrateDatabase({ url, migrationsFolder })).toEqual({ applied: 1 });
});
