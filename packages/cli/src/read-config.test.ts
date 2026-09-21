import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { NAMES } from "./names";
import { readConfig } from "./read-config";

let repo: string;
let project: string;
beforeEach(async () => {
  repo = await realpath(await mkdtemp(join(tmpdir(), "mem-config-")));
  project = join(repo, "package");
  await mkdir(join(project, NAMES.MEMORIES), { recursive: true });
  await mkdir(join(repo, NAMES.MEMORIES));
});
afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

it.each([
  { value: {}, expected: undefined },
  { value: { prune: false }, expected: false },
  { value: { prune: {} }, expected: {} },
  { value: { prune: { unvotedTtl: "120d" } }, expected: { unvotedTtl: "120d" } },
])("reads root pruning settings $value without modifying the file", async ({ value, expected }) => {
  const path = join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON);
  const source = JSON.stringify(value);
  await writeFile(path, source);
  const result = await readConfig({ project: repo, repo });
  expect(result.config.prune).toEqual(expected);
  expect(result.source).toBe(source);
  expect(await readFile(path, "utf8")).toBe(source);
});

it("inherits all root pruning settings without copying them into packages", async () => {
  const prune = {
    unvotedTtl: "120d",
    humanUpvoteTtl: "200d",
    databaseUrlCommand: "./database-url",
  };
  await writeFile(join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON), JSON.stringify({ prune }));
  await writeFile(join(project, NAMES.MEMORIES, NAMES.CONFIG_JSON), "{}");
  const result = await readConfig({ project, repo });
  expect(result.config.prune).toEqual(prune);
  expect(result.local).not.toHaveProperty("prune");
});

it.each([false, {}, { unvotedTtl: "120d" }, { databaseUrlCommand: "./url" }])(
  "rejects every package prune setting %j",
  async (prune) => {
    const path = join(project, NAMES.MEMORIES, NAMES.CONFIG_JSON);
    await writeFile(path, JSON.stringify({ prune }));
    await expect(readConfig({ project, repo })).rejects.toThrow(`Remove prune from ${path}`);
  },
);

it.each([true, null, "false", { unvotedTtl: 90 }, { enabled: "no" }])(
  "rejects invalid prune value %j",
  async (prune) => {
    await writeFile(join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON), JSON.stringify({ prune }));
    await expect(readConfig({ project, repo })).rejects.toThrow("Invalid config");
  },
);

it.each(["0d", "-1d", "1.5d", "12h", "2w", "90d12h", " 1d", "1d ", "01d", "999999999999999999d"])(
  "rejects invalid day duration %s",
  async (duration) => {
    await writeFile(
      join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON),
      JSON.stringify({ prune: { unvotedTtl: duration } }),
    );
    await expect(readConfig({ project, repo })).rejects.toThrow("positive whole days");
  },
);

it.each([null, {}, "", "   ", "bad\0command", { command: "doppler", args: [] }, ["doppler"]])(
  "rejects invalid database URL commands %j",
  async (databaseUrlCommand) => {
    await writeFile(
      join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON),
      JSON.stringify({ prune: { databaseUrlCommand } }),
    );
    await expect(readConfig({ repo, project })).rejects.toThrow("Invalid config");
  },
);

it.each([
  { value: undefined, availableToWorkspace: false },
  { value: {}, availableToWorkspace: false },
  { value: { availableToWorkspace: false }, availableToWorkspace: false },
  { value: { availableToWorkspace: true }, availableToWorkspace: true },
])(
  "uses only the root availableToWorkspace setting: $value",
  async ({ value, availableToWorkspace }) => {
    if (value !== undefined)
      await writeFile(join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON), JSON.stringify(value));
    await writeFile(join(project, NAMES.MEMORIES, NAMES.CONFIG_JSON), "{}");
    expect((await readConfig({ project: repo, repo })).availableToWorkspace).toBe(
      availableToWorkspace,
    );
    const child = await readConfig({ project, repo });
    expect(child.availableToWorkspace).toBe(availableToWorkspace);
    expect(child.local).not.toHaveProperty("availableToWorkspace");
  },
);

it.each([
  { root: {}, child: true },
  { root: { availableToWorkspace: false }, child: true },
  { root: { availableToWorkspace: true }, child: false },
  { root: { availableToWorkspace: true }, child: true },
  { root: {}, child: false },
])("rejects child sharing $child with root $root", async ({ root, child }) => {
  const path = join(project, NAMES.MEMORIES, NAMES.CONFIG_JSON);
  const source = JSON.stringify({ availableToWorkspace: child });
  await writeFile(join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON), JSON.stringify(root));
  await writeFile(path, source);
  const nested = join(project, "nested");
  await mkdir(nested);
  for (const directory of [project, nested]) {
    await expect(readConfig({ project: directory, repo })).rejects.toThrow(
      `Remove availableToWorkspace from ${path}. Set it only in the repository root config: ${join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON)}`,
    );
  }
  expect(await readFile(path, "utf8")).toBe(source);
});

it.each([false, true])(
  "identifies the removed requireScope option (%s) as an unknown field",
  async (value) => {
    const path = join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON);
    await writeFile(path, JSON.stringify({ frontmatter: { requireScope: value } }));
    await expect(readConfig({ project, repo })).rejects.toThrow(
      /Remove this unknown field. Only custom[^\n]*\n  → at frontmatter.requireScope/,
    );
  },
);

it.each([false, true])(
  "identifies the removed prune.enabled option (%s) as an unknown field",
  async (value) => {
    const path = join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON);
    await writeFile(path, JSON.stringify({ prune: { enabled: value, unvotedTtl: "90d" } }));
    await expect(readConfig({ project, repo })).rejects.toThrow(
      /Remove this unknown field. Allowed pruning fields[^\n]*\n  → at prune.enabled/,
    );
  },
);

it.each([
  { value: { version: 2 }, field: "version", expected: "Expected the number 1" },
  {
    value: { availableToWorkspace: "true" },
    field: "availableToWorkspace",
    expected: "Expected a boolean: true",
  },
  {
    value: { prune: { unvotedTtl: 90 } },
    field: "prune.unvotedTtl",
    expected: 'Use a duration string of positive whole days, such as "90d"',
  },
  {
    value: { prune: { humanUpvoteTtl: [] } },
    field: "prune.humanUpvoteTtl",
    expected: "duration string",
  },
  {
    value: { prune: { agentUpvoteTtl: "" } },
    field: "prune.agentUpvoteTtl",
    expected: "duration string",
  },
  { value: { prune: { typo: 1 } }, field: "prune.typo", expected: "Allowed pruning fields" },
  {
    value: { frontmatter: { custom: [] } },
    field: "frontmatter.custom",
    expected: "Expected a JSON Schema object",
  },
  { value: { frontmatter: { typo: {} } }, field: "frontmatter.typo", expected: "Only custom" },
  { value: { typo: true }, field: "typo", expected: "Allowed config fields" },
])("explains the expected value for $field", async ({ value, field, expected }) => {
  const path = join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON);
  await writeFile(path, JSON.stringify(value));
  const error = await readConfig({ project, repo }).catch((error: Error) => error);
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toContain(path);
  expect((error as Error).message).toContain(`→ at ${field}`);
  expect((error as Error).message).toContain(expected);
});

it("includes the config file and JSON syntax guidance for malformed JSON", async () => {
  const path = join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON);
  await writeFile(path, '{"prune":');
  await expect(readConfig({ project, repo })).rejects.toThrow(
    `Invalid config ${path}: expected one valid JSON object with double-quoted keys`,
  );
});

it("inherits the root schema and pruning unchanged through packages", async () => {
  const custom = {
    $defs: { ticket: { type: "string", pattern: "^ENG-" } },
    properties: {
      ticket: { $ref: "#/$defs/ticket" },
      items: { type: "array", items: { enum: ["a", "b"] } },
    },
    required: ["ticket"],
    additionalProperties: false,
  };
  await writeFile(
    join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON),
    JSON.stringify({
      frontmatter: { custom },
      prune: { unvotedTtl: "90d", humanUpvoteTtl: "180d" },
    }),
  );
  const path = join(project, NAMES.MEMORIES, NAMES.CONFIG_JSON);
  const source = JSON.stringify({ frontmatter: {} });
  await writeFile(path, source);
  const nested = join(project, "nested");
  await mkdir(nested);
  expect((await readConfig({ project: repo, repo })).config.frontmatter?.custom).toEqual(custom);
  for (const directory of [project, nested]) {
    const result = await readConfig({ project: directory, repo });
    expect(result.config.frontmatter?.custom).toEqual(custom);
    expect(result.config.prune).toEqual({ unvotedTtl: "90d", humanUpvoteTtl: "180d" });
    expect(result.local).not.toHaveProperty("frontmatter.custom");
  }
  expect(await readFile(path, "utf8")).toBe(source);
});

it.each([
  { root: undefined, child: {} },
  { root: undefined, child: { properties: { ticket: { type: "string" } } } },
  { root: { required: ["ticket"] }, child: {} },
  { root: { required: ["ticket"] }, child: { required: ["runbook"] } },
])("rejects a child schema $child with root schema $root", async ({ root, child }) => {
  const config = join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON);
  if (root !== undefined)
    await writeFile(config, JSON.stringify({ frontmatter: { custom: root } }));
  const path = join(project, NAMES.MEMORIES, NAMES.CONFIG_JSON);
  const source = JSON.stringify({ frontmatter: { custom: child } });
  await writeFile(path, source);
  const nested = join(project, "nested");
  await mkdir(nested);
  for (const directory of [project, nested]) {
    await expect(readConfig({ project: directory, repo })).rejects.toThrow(
      `Remove frontmatter.custom from ${path}. Define it only in the repository root config: ${config}.`,
    );
  }
  expect(await readFile(path, "utf8")).toBe(source);
  if (root === undefined) await expect(readFile(config)).rejects.toMatchObject({ code: "ENOENT" });
});
