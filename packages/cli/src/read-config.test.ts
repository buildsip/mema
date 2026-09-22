import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
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
  await mkdir(project);
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
  const path = join(repo, NAMES.TIRAMISU_JSON);
  const source = JSON.stringify(value);
  await writeFile(path, source);
  const result = await readConfig(repo);
  expect(result.config.prune).toEqual(expected);
  expect(result.source).toBe(source);
  expect(await readFile(path, "utf8")).toBe(source);
});

it("ignores conflicting nested config files", async () => {
  const config = {
    version: 1,
    availableToWorkspace: true,
    frontmatter: { custom: { required: ["ticket"] } },
    prune: { databaseUrlCommand: "./database-url", unvotedTtl: "120d" },
  };
  await writeFile(join(repo, NAMES.TIRAMISU_JSON), JSON.stringify(config));
  await writeFile(
    join(project, NAMES.TIRAMISU_JSON),
    JSON.stringify({ prune: false, availableToWorkspace: false }),
  );
  expect((await readConfig(repo)).config).toEqual(config);
});

it("uses defaults without consulting package configs when the root config is missing", async () => {
  await writeFile(
    join(project, NAMES.TIRAMISU_JSON),
    JSON.stringify({ availableToWorkspace: true }),
  );
  expect(await readConfig(repo)).toEqual({
    config: {},
    availableToWorkspace: false,
    source: undefined,
  });
});

it.each([false, true])(
  "rejects a config symlink, including a dangling link (%s)",
  async (dangling) => {
    const target = join(repo, "settings.json");
    if (!dangling) await writeFile(target, "{}");
    await symlink(target, join(repo, NAMES.TIRAMISU_JSON));
    await expect(readConfig(repo)).rejects.toThrow("Symbolic links are not supported");
  },
);

it.each([true, null, "false", { unvotedTtl: 90 }, { enabled: "no" }])(
  "rejects invalid prune value %j",
  async (prune) => {
    await writeFile(join(repo, NAMES.TIRAMISU_JSON), JSON.stringify({ prune }));
    await expect(readConfig(repo)).rejects.toThrow("Invalid config");
  },
);

it.each(["0d", "-1d", "1.5d", "12h", "2w", "90d12h", " 1d", "1d ", "01d", "999999999999999999d"])(
  "rejects invalid day duration %s",
  async (duration) => {
    await writeFile(
      join(repo, NAMES.TIRAMISU_JSON),
      JSON.stringify({ prune: { unvotedTtl: duration } }),
    );
    await expect(readConfig(repo)).rejects.toThrow("positive whole days");
  },
);

it.each([null, {}, "", "   ", "bad\0command", { command: "doppler", args: [] }, ["doppler"]])(
  "rejects invalid database URL commands %j",
  async (databaseUrlCommand) => {
    await writeFile(
      join(repo, NAMES.TIRAMISU_JSON),
      JSON.stringify({ prune: { databaseUrlCommand } }),
    );
    await expect(readConfig(repo)).rejects.toThrow("Invalid config");
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
      await writeFile(join(repo, NAMES.TIRAMISU_JSON), JSON.stringify(value));
    expect((await readConfig(repo)).availableToWorkspace).toBe(availableToWorkspace);
  },
);

it.each([false, true])(
  "identifies the removed requireScope option (%s) as an unknown field",
  async (value) => {
    const path = join(repo, NAMES.TIRAMISU_JSON);
    await writeFile(path, JSON.stringify({ frontmatter: { requireScope: value } }));
    await expect(readConfig(repo)).rejects.toThrow(
      /Remove this unknown field. Only custom[^\n]*\n  → at frontmatter.requireScope/,
    );
  },
);

it.each([false, true])(
  "identifies the removed prune.enabled option (%s) as an unknown field",
  async (value) => {
    const path = join(repo, NAMES.TIRAMISU_JSON);
    await writeFile(path, JSON.stringify({ prune: { enabled: value, unvotedTtl: "90d" } }));
    await expect(readConfig(repo)).rejects.toThrow(
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
  const path = join(repo, NAMES.TIRAMISU_JSON);
  await writeFile(path, JSON.stringify(value));
  const error = await readConfig(repo).catch((error: Error) => error);
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toContain(path);
  expect((error as Error).message).toContain(`→ at ${field}`);
  expect((error as Error).message).toContain(expected);
});

it("includes the config file and JSON syntax guidance for malformed JSON", async () => {
  const path = join(repo, NAMES.TIRAMISU_JSON);
  await writeFile(path, '{"prune":');
  await expect(readConfig(repo)).rejects.toThrow(
    `Invalid config ${path}: expected one valid JSON object with double-quoted keys`,
  );
});
