import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { deleteMemories } from "./commands/delete-memories";
import { insert } from "./commands/insert";
import { prune } from "./commands/prune";
import { update } from "./commands/update";
import { upvote } from "./commands/upvote";
import { mcpTools } from "./mcp-tools";
import { migrateDatabase } from "./migrate-database";
import { readMemory } from "./read-memory";
import { cliEnv } from "./test/cli-env";
import { startDatabase } from "./test/start-database";

let temp: string;
let folder: string;
let repo: string;
let client: Client;
let url: string;
let close: (() => Promise<void>) | undefined;
const day = 86_400_000;
const now = Date.parse("2026-01-01T00:00:00Z");
const migrationsFolder = fileURLToPath(new URL("../dist/migrations", import.meta.url));

beforeAll(async () => {
  temp = await realpath(await mkdtemp(join(tmpdir(), "mema-pruning-")));
  const database = await startDatabase(temp);
  ({ client, url, close } = database);
}, 30_000);

beforeEach(async () => {
  await client.query("DROP SCHEMA IF EXISTS mema CASCADE");
  await migrateDatabase({ url, migrationsFolder });
  folder = await mkdtemp(join(temp, "workspace-"));
  repo = await makeRepo("app");
  vi.spyOn(Date, "now").mockReturnValue(now);
});

afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await close?.();
  if (temp) await rm(temp, { recursive: true, force: true });
}, 30_000);

/** Real repos keep Git history and visibility checks in the integration path. */
async function makeRepo(name: string) {
  const path = join(folder, name);
  await mkdir(path);
  execFileSync("git", ["init", "--quiet", path]);
  await configure({ repo: path });
  return path;
}

async function configure({
  repo,
  settings = {},
  shared = false,
  enabled = true,
}: {
  repo: string;
  settings?: Record<string, unknown>;
  shared?: boolean;
  enabled?: boolean;
}) {
  await mkdir(join(repo, ".memories"), { recursive: true });
  await writeFile(
    join(repo, ".memories/config.json"),
    JSON.stringify({
      availableToWorkspace: shared,
      prune: enabled ? { databaseUrlCommand: `printf '%s\\n' '${url}'`, ...settings } : false,
    }),
  );
}

async function memory({
  owner = repo,
  title = "Memory",
  protected: protectedMemory = false,
  scope = ["*"],
  // Default age is past unvotedTtl so prune tests do not depend on Git commit dates.
  at = now - 365 * day,
}: {
  owner?: string;
  title?: string;
  protected?: boolean;
  scope?: string[];
  at?: number;
} = {}) {
  vi.mocked(Date.now).mockReturnValue(at);
  const [path] = await insert({
    roots: [owner],
    repo: owner,
    body: "Useful knowledge",
    frontmatter: { title, scope, doNotDelete: protectedMemory },
  });
  vi.mocked(Date.now).mockReturnValue(now);
  const stored = await readMemory({ path: join(path!, "memory.md"), project: owner, repo: owner });
  return { path: path!, id: stored.frontmatter.id };
}

async function vote({ id, actor, at }: { id: string; actor: "human" | "agent"; at: number }) {
  await client.query(
    "INSERT INTO mema.upvotes (id, memory_id, actor, created_at) VALUES ($1, $2, $3, $4)",
    [randomUUID(), id, actor, new Date(at)],
  );
}

it("uses the maximum lifetime and the latest vote for each actor, including exact expiry", async () => {
  const expired = await memory({ title: "Expired" });
  const human = await memory({ title: "Human keeper" });
  const agent = await memory({ title: "Agent keeper" });
  const repeated = await memory({ title: "Repeated old votes" });
  await memory({ title: "Protected", protected: true });
  await vote({ id: human.id, actor: "human", at: now - 100 * day });
  await vote({ id: human.id, actor: "agent", at: now - 95 * day });
  await vote({ id: agent.id, actor: "agent", at: now - 89 * day });
  await vote({ id: agent.id, actor: "agent", at: now - 300 * day });
  await vote({ id: repeated.id, actor: "human", at: now - 180 * day });
  await vote({ id: repeated.id, actor: "human", at: now - 181 * day });
  const young = await memory({ title: "Young", at: now - 89 * day });
  await vote({ id: young.id, actor: "agent", at: now - 100 * day });
  expect(await prune({ roots: [repo], repo })).toEqual([expired.path, repeated.path].sort());
  expect(existsSync(expired.path)).toBe(true);
  // Config durations are applied at read time, without rewriting stored votes.
  await configure({ repo, settings: { unvotedTtl: "400d" } });
  expect(await prune({ roots: [repo], repo })).toEqual([]);
});

it("expires from the stored created date, not Git history", async () => {
  const fresh = await memory({ at: now });
  expect(await prune({ roots: [repo], repo })).toEqual([]);
  const expired = await memory({ title: "Expired uncommitted" });
  expect(await prune({ roots: [repo], repo })).toEqual([expired.path]);
  await writeFile(
    join(expired.path, "memory.md"),
    (await readFile(join(expired.path, "memory.md"), "utf8")) + "\nEdited today\n",
  );
  expect(await prune({ roots: [repo], repo })).toEqual([expired.path]);
  expect(await prune({ roots: [repo], repo })).not.toContain(fresh.path);
});

it("keeps created across folder moves", async () => {
  const entry = await memory({ title: "Original" });
  const path = join(repo, ".memories/data/renamed");
  await rename(entry.path, path);
  expect(await prune({ roots: [repo], repo })).toEqual([path]);
  const stored = await readMemory({
    path: join(path, "memory.md"),
    project: repo,
    repo,
  });
  expect(stored.frontmatter.created).toBe("2025-01-01");
});

it("prunes shared repos when the active repo is disabled, excludes private repos, and deduplicates roots", async () => {
  await configure({ repo, enabled: false });
  const team = await makeRepo("team");
  await configure({ repo: team, shared: true });
  const shared = await memory({ owner: team });
  const hidden = await makeRepo("private");
  await memory({ owner: hidden });
  expect(await prune({ roots: [repo, team, team, hidden], repo })).toEqual([shared.path]);
  await expect(prune({ roots: [repo], repo })).rejects.toThrow("Pruning is disabled");
});

it("records mixed-repo batches once per path and allows deletion across the same visibility boundary", async () => {
  const team = await makeRepo("team");
  await configure({ repo: team, shared: true });
  const one = await memory();
  const two = await memory({ owner: team });
  const roots = [repo, team];
  expect(
    await upvote({ roots, repo, paths: [one.path, two.path, one.path], actor: "human" }),
  ).toEqual({ upvoted: [one.path, two.path], skipped: [] });
  const rows = (await client.query("SELECT memory_id, actor FROM mema.upvotes ORDER BY memory_id"))
    .rows;
  expect(rows).toEqual([one.id, two.id].sort().map((id) => ({ memory_id: id, actor: "human" })));
  await configure({ repo, enabled: false });
  await configure({ repo: team, shared: true, enabled: false });
  expect(await deleteMemories({ roots, repo, paths: [one.path, two.path] })).toHaveLength(2);
  expect(existsSync(one.path)).toBe(false);
  expect(existsSync(two.path)).toBe(false);
});

it.each(["active", "shared"])(
  "upvotes eligible memories when the %s repo has pruning disabled",
  async (disabled) => {
    const team = await makeRepo("team");
    await configure({ repo: team, shared: true });
    const owner = disabled === "active" ? repo : team;
    await configure({ repo: owner, shared: owner === team, enabled: false });
    const one = await memory();
    const two = await memory({ owner: team });
    const extra = await memory({ owner, title: "Another skipped memory" });
    const skipped = disabled === "active" ? one : two;
    const voted = disabled === "active" ? two : one;

    const result = await upvote({
      roots: [repo, team],
      repo,
      paths: [one.path, two.path, extra.path, one.path, extra.path],
      actor: "agent",
    });
    expect(result).toEqual({
      upvoted: [voted.path],
      skipped: [
        {
          repo: owner,
          paths: [skipped.path, extra.path],
          message: expect.stringContaining(`pruning is disabled in ${owner}`),
        },
      ],
    });
    expect((await client.query("SELECT memory_id, actor FROM mema.upvotes")).rows).toEqual([
      { memory_id: voted.id, actor: "agent" },
    ]);
  },
);

it.each([false, undefined])(
  "reports every skipped repo without using the database when prune is %s",
  async (prune) => {
    const team = await makeRepo("team");
    for (const owner of [repo, team]) {
      await writeFile(
        join(owner, ".memories/config.json"),
        JSON.stringify({ availableToWorkspace: true, prune }),
      );
    }
    const one = await memory();
    const two = await memory({ owner: team });
    // Missing tables would fail any accidental vote write in this disabled batch.
    await client.query("DROP SCHEMA mema CASCADE");
    expect(
      await upvote({ roots: [repo, team], repo, paths: [one.path, two.path], actor: "human" }),
    ).toEqual({
      upvoted: [],
      skipped: [
        { repo, paths: [one.path], message: expect.stringContaining("pruning is disabled") },
        {
          repo: team,
          paths: [two.path],
          message: expect.stringContaining("pruning is disabled"),
        },
      ],
    });
  },
);

it("validates the entire upvote/delete selection before any mutation", async () => {
  const one = await memory();
  const hidden = await makeRepo("private");
  const two = await memory({ owner: hidden });
  const roots = [repo, hidden];
  await expect(
    upvote({ roots, repo, paths: [one.path, two.path], actor: "agent" }),
  ).rejects.toThrow("outside");
  await expect(deleteMemories({ roots, repo, paths: [one.path, two.path] })).rejects.toThrow(
    "outside",
  );
  expect((await client.query("SELECT * FROM mema.upvotes")).rowCount).toBe(0);
  expect(existsSync(one.path)).toBe(true);
  await configure({
    repo: hidden,
    shared: true,
    settings: { databaseUrlCommand: undefined },
  });
  await expect(
    upvote({ roots, repo, paths: [one.path, two.path], actor: "agent" }),
  ).rejects.toThrow("Set prune.databaseUrlCommand");
  expect((await client.query("SELECT * FROM mema.upvotes")).rowCount).toBe(0);
});

it("keeps cross-repo protected and nested deletion checks", async () => {
  const one = await memory();
  const team = await makeRepo("team");
  await configure({ repo: team, shared: true });
  const protectedMemory = await memory({ owner: team, protected: true });
  await expect(
    deleteMemories({ roots: [repo, team], repo, paths: [one.path, protectedMemory.path] }),
  ).rejects.toThrow("doNotDelete");
  expect(existsSync(one.path)).toBe(true);
});

it("records agent votes for renamed, package-moved, and empty updates, and skips disabled databases", async () => {
  const entry = await memory();
  await mkdir(join(repo, "web"));
  await writeFile(join(repo, "web/package.json"), "{}");
  const [moved] = await update({
    roots: [repo],
    repo,
    path: entry.path,
    frontmatter: { title: "New title", scope: ["web"] },
  });
  await update({ roots: [repo], repo, path: moved! });
  expect((await client.query("SELECT memory_id, actor FROM mema.upvotes")).rows).toEqual([
    { memory_id: entry.id, actor: "agent" },
    { memory_id: entry.id, actor: "agent" },
  ]);
  await configure({ repo, enabled: false });
  await client.query("DROP SCHEMA mema CASCADE");
  await expect(
    update({ roots: [repo], repo, path: moved!, body: "No database needed" }),
  ).resolves.toEqual([moved]);
});

it("reports a saved update path when the database fails and never migrates implicitly", async () => {
  const entry = await memory();
  await client.query("DROP SCHEMA mema CASCADE");
  const moved = join(repo, ".memories/data/renamed");
  const result = update({
    roots: [repo],
    repo,
    path: entry.path,
    frontmatter: { title: "Renamed", doNotEdit: true },
  });
  await expect(result).rejects.toThrow(`memory was saved at ${moved}`);
  await expect(result).rejects.toThrow("Run mema init");
  await expect(result).rejects.toThrow("Retry only the upvote");
  expect(existsSync(moved)).toBe(true);
  expect(
    (await client.query("SELECT to_regclass('mema.upvotes') AS name")).rows[0].name,
  ).toBeNull();
  // The recovery instruction must still work after the saved update protects the file.
  await migrateDatabase({ url, migrationsFolder });
  await expect(update({ roots: [repo], repo, path: moved })).rejects.toThrow("doNotEdit");
  expect(await upvote({ roots: [repo], repo, paths: [moved], actor: "agent" })).toEqual({
    upvoted: [moved],
    skipped: [],
  });
  expect((await client.query("SELECT memory_id, actor FROM mema.upvotes")).rows).toEqual([
    { memory_id: entry.id, actor: "agent" },
  ]);
});

it("fails prune rather than returning partial results when any enabled database is broken", async () => {
  await memory();
  const team = await makeRepo("team");
  await configure({
    repo: team,
    shared: true,
    settings: { databaseUrlCommand: "printf 'SECRET'; exit 1" },
  });
  const result = prune({ roots: [repo, team], repo });
  await expect(result).rejects.toThrow("The command you entered failed");
  await expect(result).rejects.not.toThrow("SECRET");
});

it("runs upvote and prune through CLI JSON and MCP contracts", async () => {
  const entry = await memory();
  const team = await makeRepo("team");
  await configure({ repo: team, shared: true, enabled: false });
  const skipped = await memory({ owner: team });
  const home = join(folder, "home");
  await mkdir(join(home, ".cursor"), { recursive: true });
  const cli = fileURLToPath(new URL("../dist/index.js", import.meta.url));
  const args = ["--roots", repo, team, "--repo", repo];
  const run = (command: string[]) =>
    spawnSync(process.execPath, [cli, ...command], {
      cwd: repo,
      env: cliEnv({ home }),
      encoding: "utf8",
    });
  const listed = run(["prune", ...args]);
  expect(listed.status, listed.stderr).toBe(0);
  expect(JSON.parse(listed.stdout)).toEqual([entry.path]);
  const voted = run(["upvote", ...args, "--path", entry.path, skipped.path, "--actor", "human"]);
  expect(voted.status, voted.stderr).toBe(0);
  const result = JSON.parse(voted.stdout);
  expect(result).toEqual({
    upvoted: [entry.path],
    skipped: [
      {
        repo: team,
        paths: [skipped.path],
        message: expect.stringContaining(`pruning is disabled in ${team}`),
      },
    ],
  });
  const disabled = run(["upvote", ...args, "--path", skipped.path, "--actor", "human"]);
  expect(disabled.status, disabled.stderr).toBe(0);
  expect(JSON.parse(disabled.stdout)).toEqual({ upvoted: [], skipped: result.skipped });
  const tool = mcpTools.find((tool) => tool.name === "prune-memories")!;
  const response = await tool.call({ roots: [repo], repo });
  expect(response.content).toEqual([{ type: "text", text: "[]" }]);
  const upvoteTool = mcpTools.find((tool) => tool.name === "upvote-memories")!;
  await expect(upvoteTool.call({ roots: [repo], repo, path: [entry.path] })).rejects.toThrow(
    "actor",
  );
  const upvoted = await upvoteTool.call({
    roots: [repo, team],
    repo,
    path: [entry.path, skipped.path],
    actor: "agent",
  });
  expect(upvoted.content).toEqual([{ type: "text", text: JSON.stringify(result, null, 2) }]);
  expect((await client.query("SELECT actor FROM mema.upvotes ORDER BY actor")).rows).toEqual([
    { actor: "agent" },
    { actor: "human" },
  ]);
  await expect(tool.call({ roots: [repo], repo, scope: ["*"] })).rejects.toThrow("Remove unknown");
});
