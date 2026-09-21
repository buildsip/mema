import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { PassThrough } from "node:stream";
import { confirm, log, outro, text } from "@clack/prompts";
import { parse } from "jsonc-parser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { init } from "./commands/init";
import { NAMES } from "./names";
import { getDatabaseUrl } from "./get-database-url";
import { migrateDatabase } from "./migrate-database";

vi.mock("./get-database-url", () => ({ getDatabaseUrl: vi.fn() }));
vi.mock("./migrate-database", () => ({ migrateDatabase: vi.fn() }));

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:child_process")>();
  return { ...original, execFileSync: vi.fn(original.execFileSync) };
});
vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return { ...original, writeFileSync: vi.fn(original.writeFileSync) };
});
vi.mock("@clack/prompts", async (importOriginal) => {
  const original = await importOriginal<typeof import("@clack/prompts")>();
  return {
    ...original,
    confirm: vi.fn(),
    text: vi.fn(),
    intro: vi.fn(),
    log: { info: vi.fn(), step: vi.fn(), warn: vi.fn() },
    outro: vi.fn(),
  };
});

const dbCommand = "doppler secrets get MEMA_DATABASE_URL --plain";

describe("mema init", () => {
  let temp: string;
  let root: string;
  let web: string;
  let cliRoot: string;
  let globalRoot: string;
  let latest: string;
  let bunMissing: boolean;
  let failure: string | undefined;
  let cancelled: boolean | symbol;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(getDatabaseUrl).mockReset().mockResolvedValue("postgresql://example.test/memories");
    vi.mocked(migrateDatabase).mockReset().mockResolvedValue({ applied: 1 });
    vi.mocked(text).mockReset().mockResolvedValue(dbCommand);
    vi.stubEnv("MEMA_DATABASE_URL", "");
    vi.stubEnv("MEMA_INSTALL_MODE", undefined);
    vi.stubEnv("npm_config_user_agent", "pnpm/11.24.0 npm/? node/v22.0.0");
    latest = "0.2.0";
    bunMissing = false;
    failure = undefined;
    const original =
      await vi.importActual<typeof import("node:child_process")>("node:child_process");
    vi.mocked(execFileSync).mockImplementation((...args) => {
      if (args[0] === "npx") {
        if (failure === "skills") throw new Error("Could not install skill");
        return Buffer.from("");
      }
      if (["pnpm", "npm", "yarn", "bun"].includes(args[0])) {
        const command = (args[1] as string[])[0];
        if (command === failure) throw new Error(`Could not ${command}`);
        if (command === "root") return globalRoot;
        if (command === "global" && (args[1] as string[])[1] === "dir") return dirname(globalRoot);
        if (command === "pm") {
          if (bunMissing)
            throw Object.assign(new Error("No global packages"), {
              stderr: `error: No package.json was found for directory "${dirname(globalRoot)}"`,
            });
          return `${dirname(globalRoot)} node_modules (1 installed)\n└── mema@0.1.0\n`;
        }
        if (command === "view" || command === "info")
          return JSON.stringify(args[0] === "yarn" ? { type: "inspect", data: latest } : latest);
        return Buffer.from("");
      }
      return Reflect.apply(original.execFileSync, undefined, args);
    });
    const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
    vi.mocked(writeFileSync).mockImplementation(fs.writeFileSync);
    vi.mocked(confirm)
      .mockReset()
      .mockImplementation(async (options) => options.initialValue ?? false);
    const prompts = await vi.importActual<typeof import("@clack/prompts")>("@clack/prompts");
    cancelled = await prompts.confirm({
      message: "Cancel",
      signal: AbortSignal.abort(),
      input: new PassThrough(),
      output: new PassThrough(),
    });
    temp = realpathSync(mkdtempSync(join(tmpdir(), "mem-init-")));
    root = join(temp, "repo with spaces");
    web = join(root, "apps", "web");
    cliRoot = join(temp, "mema source");
    globalRoot = join(temp, "global with spaces", NAMES.NODE_MODULES);
    mkdirSync(join(web, "src"), { recursive: true });
    mkdirSync(join(cliRoot, "scripts"), { recursive: true });
    writeFileSync(join(cliRoot, "scripts", "build.mjs"), "");
    mkdirSync(join(cliRoot, NAMES.TEMPLATES), { recursive: true });
    writeFileSync(
      join(cliRoot, NAMES.TEMPLATES, NAMES.AGENTS_MD),
      readFileSync(new URL("../templates/AGENTS.md", import.meta.url), "utf8"),
    );
    mkdirSync(join(cliRoot, NAMES.SKILLS, NAMES.MEMORY_WRITING_SKILL), { recursive: true });
    writeFileSync(
      join(cliRoot, NAMES.SKILLS, NAMES.MEMORY_WRITING_SKILL, NAMES.SKILL_MD),
      readFileSync(new URL("../skills/mema-memory-writing/SKILL.md", import.meta.url), "utf8"),
    );
    writeFileSync(
      join(cliRoot, NAMES.PACKAGE_JSON),
      JSON.stringify({
        name: "mema",
        version: "0.1.0",
        private: true,
        bin: { mema: "dist/index.js" },
      }),
    );
    writeFileSync(join(root, NAMES.PACKAGE_JSON), '{"name":"@acme/monorepo"}');
    writeFileSync(join(web, NAMES.PACKAGE_JSON), '{"name":"@acme/web"}');
    execFileSync("git", ["init", "--quiet", root]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    rmSync(temp, { recursive: true, force: true });
  });

  function existing(value: object) {
    mkdirSync(join(root, NAMES.MEMORIES), { recursive: true });
    writeFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), JSON.stringify(value));
  }

  function installed(version: string) {
    mkdirSync(join(globalRoot, "mema"), { recursive: true });
    writeFileSync(
      join(globalRoot, "mema", NAMES.PACKAGE_JSON),
      JSON.stringify({ name: "mema", version, bin: { mema: "dist/index.js" } }),
    );
  }

  function published() {
    vi.stubEnv("npm_config_user_agent", "npm/11.0.0 node/v22.0.0");
    writeFileSync(
      join(cliRoot, NAMES.PACKAGE_JSON),
      JSON.stringify({ name: "mema", version: "0.1.0", bin: { mema: "dist/index.js" } }),
    );
  }

  it("creates only config at the monorepo root and installs the built local CLI", async () => {
    await init({ cwd: root, cliRoot });
    const memories = join(root, NAMES.MEMORIES);
    expect(JSON.parse(readFileSync(join(memories, NAMES.CONFIG_JSON), "utf8"))).toEqual({
      version: 1,
      availableToWorkspace: false,
      prune: false,
    });
    expect(readdirSync(memories)).toEqual([NAMES.CONFIG_JSON]);
    expect(existsSync(join(web, NAMES.MEMORIES))).toBe(false);
    expect(execFileSync).toHaveBeenCalledWith(
      "pnpm",
      ["add", "-g", cliRoot],
      expect.objectContaining({ cwd: root }),
    );
    expect(
      vi
        .mocked(execFileSync)
        .mock.calls.some(([, args]) => Array.isArray(args) && ["build", "view"].includes(args[0]!)),
    ).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(5);
    expect(outro).toHaveBeenCalledWith("mema initialized.");
    expect(log.info).not.toHaveBeenCalled();
  });

  it.each(["", "src"])("initializes the repo first from a nested package's %j", async (subdir) => {
    await init({ cwd: join(web, subdir), cliRoot });
    expect(JSON.parse(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8"))).toEqual(
      {
        version: 1,
        availableToWorkspace: false,
        prune: false,
      },
    );
    expect(existsSync(join(web, NAMES.MEMORIES))).toBe(false);
    expect(existsSync(join(web, "src", NAMES.MEMORIES))).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(5);
    expect(log.info).toHaveBeenCalledWith(
      `First-time setup: initializing the repository at ${root}. Run mema init again from this package to configure it.`,
    );
    expect(execFileSync).toHaveBeenCalledWith(
      "pnpm",
      ["add", "-g", cliRoot],
      expect.objectContaining({ cwd: root }),
    );
    expect(outro).toHaveBeenCalledWith("mema initialized.");
  });

  it.each(["", "src"])(
    "initializes the nearest package from %j after repo setup",
    async (subdir) => {
      existing({});
      await init({ cwd: join(web, subdir), cliRoot });
      expect(
        JSON.parse(readFileSync(join(web, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8")),
      ).toEqual({
        version: 1,
        prune: false,
      });
      expect(confirm).toHaveBeenCalledTimes(2);
      expect(
        vi.mocked(confirm).mock.calls.some(([options]) => options.message.includes("workspace")),
      ).toBe(false);
      expect(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8")).toBe("{}");
      expect(existsSync(join(web, "src", NAMES.MEMORIES))).toBe(false);
      expect(log.info).not.toHaveBeenCalled();
      expect(outro).toHaveBeenCalledWith("mema initialized.");
      expect(existsSync(join(root, NAMES.VSCODE, NAMES.SETTINGS_JSON))).toBe(true);
    },
  );

  it("initializes the package on the next run from the same directory", async () => {
    const cwd = join(web, "src");
    await init({ cwd, cliRoot });
    const path = join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON);
    const source = readFileSync(path, "utf8");
    vi.mocked(confirm).mockClear();
    await init({ cwd, cliRoot });
    expect(readFileSync(path, "utf8")).toBe(source);
    expect(JSON.parse(readFileSync(join(web, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8"))).toEqual({
      version: 1,
      prune: false,
    });
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(outro).toHaveBeenLastCalledWith("mema initialized.");
  });

  it("preserves an existing package config while completing first-time repo setup", async () => {
    mkdirSync(join(web, NAMES.MEMORIES, NAMES.DATA), { recursive: true });
    const path = join(web, NAMES.MEMORIES, NAMES.CONFIG_JSON);
    const source = '{"prune":{"ttl":"120d"}}';
    writeFileSync(path, source);
    writeFileSync(join(web, NAMES.MEMORIES, NAMES.DATA, "keep.txt"), "keep");
    await init({ cwd: web, cliRoot });
    expect(readFileSync(path, "utf8")).toBe(source);
    expect(readFileSync(join(web, NAMES.MEMORIES, NAMES.DATA, "keep.txt"), "utf8")).toBe("keep");
    expect(JSON.parse(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8"))).toEqual(
      {
        version: 1,
        availableToWorkspace: false,
        prune: false,
      },
    );
    expect(confirm).toHaveBeenCalledTimes(5);
  });

  it("offers package reconfiguration once the repo is initialized", async () => {
    existing({});
    mkdirSync(join(web, NAMES.MEMORIES));
    const path = join(web, NAMES.MEMORIES, NAMES.CONFIG_JSON);
    const source = '{"prune":false}';
    writeFileSync(path, source);
    await init({ cwd: join(web, "src"), cliRoot });
    expect(confirm).toHaveBeenCalledExactlyOnceWith({
      message: "mema is already initialized. Reconfigure its settings?",
      initialValue: false,
    });
    expect(readFileSync(path, "utf8")).toBe(source);
    expect(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8")).toBe("{}");
    expect(log.step).not.toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith("mema unchanged.");
  });

  it.each(["", '{"broken":', '{"version":2}'])(
    "rejects an invalid root config %j from a nested package before setup",
    async (source) => {
      existing({});
      const path = join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON);
      writeFileSync(path, source);
      await expect(init({ cwd: web, cliRoot })).rejects.toThrow("config");
      expect(readFileSync(path, "utf8")).toBe(source);
      expect(existsSync(join(web, NAMES.MEMORIES))).toBe(false);
      expect(confirm).not.toHaveBeenCalled();
      expect(log.step).not.toHaveBeenCalled();
    },
  );

  it("initializes a worktree without a project manifest and uses the CLI package name", async () => {
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Mem Test",
        "-c",
        "user.email=mema@example.test",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "--allow-empty",
        "-m",
        "fixture",
      ],
      { cwd: root, stdio: "pipe" },
    );
    const worktree = join(temp, "worktree");
    execFileSync("git", ["worktree", "add", "--detach", worktree], { cwd: root, stdio: "pipe" });
    const nested = join(worktree, "packages", "web");
    mkdirSync(join(nested, "src"), { recursive: true });
    writeFileSync(join(nested, NAMES.PACKAGE_JSON), '{"name":"web"}');
    await init({ cwd: join(nested, "src"), cliRoot });
    expect(existsSync(join(worktree, NAMES.MEMORIES, NAMES.CONFIG_JSON))).toBe(true);
    expect(existsSync(join(nested, NAMES.MEMORIES))).toBe(false);
    expect(existsSync(join(root, NAMES.MEMORIES))).toBe(false);
    expect(outro).toHaveBeenCalledWith("mema initialized.");
  });

  it("fails outside Git before prompting or installing", async () => {
    await expect(init({ cwd: temp, cliRoot })).rejects.toThrow("Git working tree");
    expect(confirm).not.toHaveBeenCalled();
    expect(log.step).not.toHaveBeenCalled();
  });

  it("offers reconfiguration and leaves settings untouched when declined", async () => {
    const value = { frontmatter: { custom: {} }, prune: false };
    existing(value);
    await init({ cwd: root, cliRoot });
    expect(JSON.parse(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8"))).toEqual(
      value,
    );
    expect(confirm).toHaveBeenCalledOnce();
    expect(log.step).not.toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith("mema unchanged.");
  });

  it("replaces the command while preserving custom settings, durations, and memories", async () => {
    const value = {
      version: 1,
      availableToWorkspace: true,
      frontmatter: { custom: { properties: { ticket: { type: "string" } } } },
      prune: {
        ttl: "120d",
        humanUpvoteAdds: "200d",
        agentUpvoteAdds: "100d",
        databaseUrlCommand: "secrets read",
      },
    };
    existing(value);
    mkdirSync(join(root, NAMES.MEMORIES, NAMES.DATA));
    writeFileSync(join(root, NAMES.MEMORIES, NAMES.DATA, "keep.txt"), "keep");
    vi.mocked(confirm).mockResolvedValueOnce(true);
    await init({ cwd: root, cliRoot });
    expect(JSON.parse(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8"))).toEqual(
      { ...value, prune: { ...value.prune, databaseUrlCommand: dbCommand } },
    );
    expect(readFileSync(join(root, NAMES.MEMORIES, NAMES.DATA, "keep.txt"), "utf8")).toBe("keep");
    expect(vi.mocked(confirm).mock.calls[1]?.[0].initialValue).toBe(true);
    expect(vi.mocked(confirm).mock.calls[2]?.[0].initialValue).toBe(true);
  });

  it("does not copy inherited sharing or custom schemas into a new package config", async () => {
    existing({
      availableToWorkspace: true,
      frontmatter: { custom: { properties: { ticket: { type: "string" } } } },
      prune: { ttl: "120d" },
    });
    vi.mocked(confirm).mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    await init({ cwd: web, cliRoot });
    expect(JSON.parse(readFileSync(join(web, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8"))).toEqual({
      version: 1,
      prune: false,
    });
    expect(vi.mocked(confirm).mock.calls[0]?.[0].initialValue).toBe(true);
  });

  it.each([false, true])(
    "rejects package sharing %s before prompting or installing",
    async (value) => {
      existing({});
      mkdirSync(join(web, NAMES.MEMORIES));
      const path = join(web, NAMES.MEMORIES, NAMES.CONFIG_JSON);
      const source = JSON.stringify({ availableToWorkspace: value });
      writeFileSync(path, source);
      await expect(init({ cwd: web, cliRoot })).rejects.toThrow(
        `Remove availableToWorkspace from ${path}`,
      );
      expect(confirm).not.toHaveBeenCalled();
      expect(log.step).not.toHaveBeenCalled();
      expect(readFileSync(path, "utf8")).toBe(source);
    },
  );

  it("initializes a store already populated by insert without disturbing its data", async () => {
    mkdirSync(join(root, NAMES.MEMORIES, NAMES.DATA), { recursive: true });
    writeFileSync(join(root, NAMES.MEMORIES, NAMES.DATA, "keep.txt"), "keep");
    await init({ cwd: web, cliRoot });
    expect(readFileSync(join(root, NAMES.MEMORIES, NAMES.DATA, "keep.txt"), "utf8")).toBe("keep");
    expect(existsSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON))).toBe(true);
    expect(existsSync(join(web, NAMES.MEMORIES))).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(5);
  });

  it.each(["file", "dangling symlink"])("rejects an existing .memories %s", async (kind) => {
    if (kind === "file") writeFileSync(join(root, NAMES.MEMORIES), "keep");
    else symlinkSync(join(temp, "missing"), join(root, NAMES.MEMORIES), "dir");
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow();
    expect(confirm).not.toHaveBeenCalled();
  });

  it.each([0, 1, 2, 3, 4])("cancels prompt %i without writing or installing", async (position) => {
    for (let i = 0; i < position; i++) vi.mocked(confirm).mockResolvedValueOnce(false);
    vi.mocked(confirm).mockResolvedValueOnce(cancelled);
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("cancelled");
    expect(existsSync(join(root, NAMES.MEMORIES))).toBe(false);
    expect(existsSync(join(root, NAMES.VSCODE))).toBe(false);
    expect(log.step).not.toHaveBeenCalled();
  });

  it("cancels reconfiguration without touching the existing config", async () => {
    existing({ prune: false });
    vi.mocked(confirm).mockResolvedValueOnce(cancelled);
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("cancelled");
    expect(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8")).toBe(
      '{"prune":false}',
    );
  });

  it.each([0, 1])(
    "collects one full command and applies %i pending migrations",
    async (applied) => {
      vi.mocked(migrateDatabase).mockResolvedValue({ applied });
      vi.mocked(confirm)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      await init({ cwd: root, cliRoot });
      const value = JSON.parse(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8"));
      expect(value.prune).toEqual({
        ttl: "90d",
        humanUpvoteAdds: "180d",
        agentUpvoteAdds: "90d",
        databaseUrlCommand: dbCommand,
      });
      expect(getDatabaseUrl).toHaveBeenCalledWith({ repo: root, command: dbCommand });
      expect(migrateDatabase).toHaveBeenCalledWith({
        url: "postgresql://example.test/memories",
        migrationsFolder: join(cliRoot, "dist", "migrations"),
      });
      expect(value).not.toHaveProperty("database");
      expect(value.prune).not.toHaveProperty("database");
      expect(JSON.stringify(value)).not.toContain("postgresql://");
      expect(existsSync(join(root, ".env"))).toBe(false);
      expect(text).toHaveBeenCalledOnce();
      // The command prompt comes immediately after pruning, before unrelated setup prompts.
      expect(vi.mocked(text).mock.invocationCallOrder[0]).toBeGreaterThan(
        vi.mocked(confirm).mock.invocationCallOrder[1]!,
      );
      expect(vi.mocked(text).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(confirm).mock.invocationCallOrder[2]!,
      );
    },
  );

  it("does not resolve credentials or migrate when pruning is disabled", async () => {
    await init({ cwd: root, cliRoot });
    expect(getDatabaseUrl).not.toHaveBeenCalled();
    expect(migrateDatabase).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
  });

  it("requires a new command and checks migrations on accepted root reconfiguration", async () => {
    existing({ version: 1, prune: { databaseUrlCommand: "old-command" } });
    vi.mocked(confirm).mockResolvedValueOnce(true);
    await init({ cwd: root, cliRoot });
    expect(text).toHaveBeenCalledOnce();
    expect(getDatabaseUrl).toHaveBeenCalledExactlyOnceWith({ repo: root, command: dbCommand });
    expect(migrateDatabase).toHaveBeenCalledOnce();
    expect(
      JSON.parse(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8")).prune
        .databaseUrlCommand,
    ).toBe(dbCommand);
  });

  it("rejects blank input without supplying the old command or a default", async () => {
    existing({ prune: { databaseUrlCommand: "old-command" } });
    vi.mocked(confirm).mockResolvedValueOnce(true);
    vi.mocked(text).mockImplementationOnce(async (options) => {
      expect(options.initialValue).toBeUndefined();
      expect(options.defaultValue).toBeUndefined();
      if (typeof options.validate !== "function") throw new Error("Expected a command validator.");
      for (const value of [undefined, "", "   "]) {
        expect(options.validate(value)).toContain("Enter the full command");
      }
      expect(options.validate(dbCommand)).toBeUndefined();
      return dbCommand;
    });
    await init({ cwd: root, cliRoot });
    expect(getDatabaseUrl).toHaveBeenCalledExactlyOnceWith({ repo: root, command: dbCommand });
  });

  it("requires fresh input during package setup even when the root has a command", async () => {
    const settings = { prune: { ttl: "120d", databaseUrlCommand: "root-command" } };
    existing(settings);
    await init({ cwd: web, cliRoot });
    expect(text).toHaveBeenCalledOnce();
    expect(getDatabaseUrl).toHaveBeenCalledExactlyOnceWith({ repo: root, command: dbCommand });
    const value = JSON.parse(readFileSync(join(web, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8"));
    expect(value.prune).toEqual({
      ttl: "120d",
      humanUpvoteAdds: "180d",
      agentUpvoteAdds: "90d",
      databaseUrlCommand: dbCommand,
    });
    expect(JSON.parse(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8"))).toEqual(
      settings,
    );
  });

  it("replaces a package's own saved command on reconfiguration", async () => {
    existing({ prune: false });
    mkdirSync(join(web, NAMES.MEMORIES));
    writeFileSync(
      join(web, NAMES.MEMORIES, NAMES.CONFIG_JSON),
      JSON.stringify({ prune: { databaseUrlCommand: "package-command" } }),
    );
    vi.mocked(confirm).mockResolvedValueOnce(true);
    await init({ cwd: web, cliRoot });
    expect(getDatabaseUrl).toHaveBeenCalledExactlyOnceWith({ repo: root, command: dbCommand });
    expect(
      JSON.parse(readFileSync(join(web, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8")).prune
        .databaseUrlCommand,
    ).toBe(dbCommand);
  });

  it("disables pruning without running the saved database command", async () => {
    existing({ prune: { databaseUrlCommand: "old-command" } });
    vi.mocked(confirm)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    await init({ cwd: root, cliRoot });
    const value = JSON.parse(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8"));
    expect(value.prune).toBe(false);
    expect(getDatabaseUrl).not.toHaveBeenCalled();
    expect(migrateDatabase).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
  });

  it("stores a package command without enabling pruning at the root", async () => {
    const settings = {
      version: 1,
      availableToWorkspace: true,
      prune: false,
      frontmatter: { custom: {} },
    };
    existing(settings);
    vi.mocked(confirm).mockResolvedValueOnce(true);
    await init({ cwd: web, cliRoot });
    expect(JSON.parse(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8"))).toEqual(
      settings,
    );
    expect(
      JSON.parse(readFileSync(join(web, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8")).prune
        .databaseUrlCommand,
    ).toBe(dbCommand);
    expect(getDatabaseUrl).toHaveBeenCalledWith({ repo: root, command: dbCommand });
  });

  it("leaves root and package configuration untouched if migration fails", async () => {
    existing({ prune: false });
    const path = join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON);
    const before = readFileSync(path, "utf8");
    vi.mocked(confirm).mockResolvedValueOnce(true);
    vi.mocked(migrateDatabase).mockRejectedValue(new Error("Database setup failed."));
    await expect(init({ cwd: web, cliRoot })).rejects.toThrow("Database setup failed");
    expect(readFileSync(path, "utf8")).toBe(before);
    expect(existsSync(join(web, NAMES.MEMORIES))).toBe(false);
  });

  it("asks again after invalid output and saves only the successful command", async () => {
    vi.mocked(confirm).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    vi.mocked(text).mockResolvedValueOnce("wrong-command").mockResolvedValueOnce(dbCommand);
    vi.mocked(getDatabaseUrl).mockRejectedValueOnce(
      new Error("The database command must print exactly one PostgreSQL URL."),
    );
    await init({ cwd: root, cliRoot });
    expect(text).toHaveBeenCalledTimes(2);
    expect(log.warn).toHaveBeenCalledWith(
      "The database command must print exactly one PostgreSQL URL.",
    );
    expect(migrateDatabase).toHaveBeenCalledOnce();
    const value = JSON.parse(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8"));
    expect(value.prune.databaseUrlCommand).toBe(dbCommand);
    expect(JSON.stringify(value)).not.toContain("wrong-command");
  });

  it("allows cancellation after invalid output without changing the saved command", async () => {
    existing({ prune: { databaseUrlCommand: "old-command" } });
    const path = join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON);
    const before = readFileSync(path, "utf8");
    vi.mocked(getDatabaseUrl).mockRejectedValueOnce(new Error("Invalid PostgreSQL URL."));
    vi.mocked(text)
      .mockResolvedValueOnce("wrong-command")
      .mockResolvedValueOnce(cancelled as symbol);
    await expect(init({ cwd: web, cliRoot })).rejects.toThrow("cancelled");
    expect(getDatabaseUrl).toHaveBeenCalledExactlyOnceWith({
      repo: root,
      command: "wrong-command",
    });
    expect(readFileSync(path, "utf8")).toBe(before);
    expect(migrateDatabase).not.toHaveBeenCalled();
    expect(existsSync(join(web, NAMES.MEMORIES))).toBe(false);
  });

  it("leaves root edits during package setup unchanged", async () => {
    existing({ prune: false });
    const path = join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON);
    const updated = '{"prune":false,"availableToWorkspace":true}';
    vi.mocked(confirm).mockImplementationOnce(async () => {
      writeFileSync(path, updated);
      return true;
    });
    await init({ cwd: web, cliRoot });
    expect(readFileSync(path, "utf8")).toBe(updated);
    expect(
      JSON.parse(readFileSync(join(web, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8")).prune
        .databaseUrlCommand,
    ).toBe(dbCommand);
  });

  it("cancels package credential input without saving or using the inherited command", async () => {
    existing({ prune: { databaseUrlCommand: "old-command" } });
    const path = join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON);
    const before = readFileSync(path, "utf8");
    vi.mocked(text).mockResolvedValueOnce(cancelled as symbol);
    await expect(init({ cwd: web, cliRoot })).rejects.toThrow("cancelled");
    expect(readFileSync(path, "utf8")).toBe(before);
    expect(existsSync(join(web, NAMES.MEMORIES))).toBe(false);
    expect(getDatabaseUrl).not.toHaveBeenCalled();
    expect(migrateDatabase).not.toHaveBeenCalled();
  });

  it("leaves the saved command untouched when database setup fails", async () => {
    existing({ prune: { databaseUrlCommand: "old-command" } });
    const before = readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8");
    vi.mocked(confirm).mockResolvedValueOnce(true);
    vi.mocked(migrateDatabase).mockRejectedValue(new Error("Database setup failed."));
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("Database setup failed");
    expect(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8")).toBe(before);
    expect(outro).not.toHaveBeenCalled();
  });

  it("cancels database configuration without saving or migrating", async () => {
    vi.mocked(confirm).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    vi.mocked(text).mockResolvedValueOnce(cancelled as symbol);
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("cancelled");
    expect(migrateDatabase).not.toHaveBeenCalled();
    expect(existsSync(join(root, NAMES.MEMORIES))).toBe(false);
  });

  it("preserves JSONC comments, unrelated settings, and other labels", async () => {
    mkdirSync(join(root, NAMES.VSCODE));
    writeFileSync(
      join(root, NAMES.VSCODE, NAMES.SETTINGS_JSON),
      '{\n // Keep this\n "editor.tabSize": 4,\n "workbench.editor.customLabels.patterns": {"**/index.ts":"${dirname}"},\n}',
    );
    await init({ cwd: root, cliRoot });
    const text = readFileSync(join(root, NAMES.VSCODE, NAMES.SETTINGS_JSON), "utf8");
    expect(text).toContain("// Keep this");
    expect(parse(text)).toEqual({
      "editor.tabSize": 4,
      "workbench.editor.customLabels.patterns": {
        "**/index.ts": "${dirname}",
        [`**/${NAMES.MEMORIES}/**/${NAMES.MEMORY_MD}`]: `\${dirname}/${NAMES.MEMORY_MD}`,
      },
    });
  });

  it.each(["", "// Empty settings\n", "{}", '{"editor.tabSize":4}'])(
    "handles settings %j",
    async (text) => {
      mkdirSync(join(root, NAMES.VSCODE));
      writeFileSync(join(root, NAMES.VSCODE, NAMES.SETTINGS_JSON), text);
      await init({ cwd: root, cliRoot });
      expect(
        parse(readFileSync(join(root, NAMES.VSCODE, NAMES.SETTINGS_JSON), "utf8"))[
          "workbench.editor.customLabels.patterns"
        ],
      ).toEqual({
        [`**/${NAMES.MEMORIES}/**/${NAMES.MEMORY_MD}`]: `\${dirname}/${NAMES.MEMORY_MD}`,
      });
    },
  );

  it.each([
    '{"broken":',
    "[]",
    "null",
    '{"workbench.editor.customLabels.patterns":null}',
    '{"workbench.editor.customLabels.patterns":[]}',
  ])("rejects invalid settings %j before installing", async (text) => {
    mkdirSync(join(root, NAMES.VSCODE));
    const path = join(root, NAMES.VSCODE, NAMES.SETTINGS_JSON);
    writeFileSync(path, text);
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("Cannot update");
    expect(readFileSync(path, "utf8")).toBe(text);
    expect(log.step).not.toHaveBeenCalled();
  });

  it("leaves editor and ignore files untouched when labels are declined", async () => {
    mkdirSync(join(root, NAMES.VSCODE));
    const paths = [
      join(root, ".gitignore"),
      join(root, ".npmignore"),
      join(root, NAMES.VSCODE, NAMES.SETTINGS_JSON),
    ];
    for (const path of paths) writeFileSync(path, "keep");
    vi.mocked(confirm).mockResolvedValue(false);
    await init({ cwd: root, cliRoot });
    for (const path of paths) expect(readFileSync(path, "utf8")).toBe("keep");
  });

  it("does not scaffold if global installation fails", async () => {
    failure = "add";
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("Could not install mema globally");
    expect(existsSync(join(root, NAMES.MEMORIES))).toBe(false);
    expect(outro).not.toHaveBeenCalled();
  });

  it.each([
    { skill: true, instructions: true },
    { skill: true, instructions: false },
    { skill: false, instructions: true },
    { skill: false, instructions: false },
  ])("independently opts into skill=$skill and instructions=$instructions", async (answers) => {
    vi.mocked(confirm).mockImplementation(async (options) => {
      if (options.message.startsWith("Install the global memory-writing skill")) {
        expect(options.initialValue).toBe(true);
        return answers.skill;
      }
      if (options.message.startsWith("Add starter instructions")) {
        expect(options.message).toContain(join(root, NAMES.AGENTS_MD));
        return answers.instructions;
      }
      return options.initialValue ?? false;
    });
    await init({ cwd: join(web, "src"), cliRoot });
    const installs = vi.mocked(execFileSync).mock.calls.filter(([command]) => command === "npx");
    expect(installs).toHaveLength(answers.skill ? 1 : 0);
    if (answers.skill) {
      expect(execFileSync).toHaveBeenCalledWith(
        "npx",
        [
          "--yes",
          "skills",
          "add",
          join(cliRoot, NAMES.SKILLS, NAMES.MEMORY_WRITING_SKILL),
          "--global",
          "--yes",
        ],
        expect.objectContaining({ cwd: root }),
      );
    }
    expect(existsSync(join(root, NAMES.AGENTS_MD))).toBe(answers.instructions);
    expect(existsSync(join(web, NAMES.AGENTS_MD))).toBe(false);
    if (answers.instructions) {
      const text = readFileSync(join(root, NAMES.AGENTS_MD), "utf8");
      expect(text).toContain("## When to create a memory");
      expect(text).toContain(NAMES.MEMORY_WRITING_SKILL);
      expect(text).toContain(
        readFileSync(join(cliRoot, NAMES.TEMPLATES, NAMES.AGENTS_MD), "utf8").trimEnd(),
      );
    }
  });

  it.each(["", "# Team rules", "# Team rules\n", "# Team rules\r\n\r\n"])(
    "appends starter instructions while preserving existing AGENTS.md bytes: %j",
    async (previous) => {
      const path = join(root, NAMES.AGENTS_MD);
      writeFileSync(path, previous);
      await init({ cwd: root, cliRoot });
      const text = readFileSync(path, "utf8");
      expect(text.startsWith(previous)).toBe(true);
      expect(text.match(/<!-- mema:instructions -->/g)).toHaveLength(1);
      if (previous.includes("\r\n")) expect(text.replaceAll("\r\n", "")).not.toContain("\n");
    },
  );

  it("refreshes the skill but preserves customized starter rules on repeated setup", async () => {
    installed("0.2.0");
    await init({ cwd: root, cliRoot });
    const path = join(root, NAMES.AGENTS_MD);
    const customized = readFileSync(path, "utf8").replace(
      "## When to create a memory",
      "## Our team's rules\n\nOnly save memories when requested.",
    );
    writeFileSync(path, customized);
    vi.mocked(confirm).mockResolvedValueOnce(true);
    await init({ cwd: root, cliRoot });
    expect(readFileSync(path, "utf8")).toBe(customized);
    expect(
      vi.mocked(execFileSync).mock.calls.filter(([command]) => command === "npx"),
    ).toHaveLength(2);
  });

  it("leaves files unchanged when skill installation fails", async () => {
    const path = join(root, NAMES.AGENTS_MD);
    writeFileSync(path, "Existing team instructions");
    failure = "skills";
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("mema init --verbose");
    expect(readFileSync(path, "utf8")).toBe("Existing team instructions");
    expect(existsSync(join(root, NAMES.MEMORIES))).toBe(false);
    expect(existsSync(join(root, NAMES.VSCODE))).toBe(false);
    expect(outro).not.toHaveBeenCalled();
  });

  it("rejects an AGENTS.md symlink before installing", async () => {
    const outside = join(temp, "outside.md");
    writeFileSync(outside, "Keep this");
    symlinkSync(outside, join(root, NAMES.AGENTS_MD));
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("Symbolic links");
    expect(readFileSync(outside, "utf8")).toBe("Keep this");
    expect(log.step).not.toHaveBeenCalled();
  });

  it("preserves AGENTS.md edits made while installing the skill", async () => {
    const path = join(root, NAMES.AGENTS_MD);
    writeFileSync(path, "Before install");
    const run = vi.mocked(execFileSync).getMockImplementation()!;
    vi.mocked(execFileSync).mockImplementation((...args) => {
      if (args[0] === "npx") writeFileSync(path, "Concurrent edit");
      return Reflect.apply(run, undefined, args);
    });
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("Settings changed");
    expect(readFileSync(path, "utf8")).toBe("Concurrent edit");
    expect(existsSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON))).toBe(false);
  });

  it("skips reinstalling an equal or newer private global CLI", async () => {
    installed("0.2.0");
    await init({ cwd: root, cliRoot });
    expect(log.step).toHaveBeenCalledExactlyOnceWith("Installing mema-memory-writing globally.");
    expect(confirm).toHaveBeenCalledTimes(5);
  });

  it("rebuilds and links a public development package even when a newer CLI is installed", async () => {
    published();
    installed("0.2.0");
    vi.stubEnv("MEMA_INSTALL_MODE", "link");
    await init({ cwd: root, cliRoot });
    const calls = vi.mocked(execFileSync).mock.calls.filter(([command]) => command === "pnpm");
    expect(calls).toEqual([
      ["pnpm", ["build"], expect.objectContaining({ cwd: cliRoot, stdio: "pipe" })],
      ["pnpm", ["add", "-g", "."], expect.objectContaining({ cwd: cliRoot, stdio: "pipe" })],
    ]);
    expect(execFileSync).not.toHaveBeenCalledWith("npm", expect.anything(), expect.anything());
    expect(confirm).toHaveBeenCalledTimes(5);
    expect(log.warn).not.toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith("mema initialized.");
  });

  it("shows local build and link output in verbose mode", async () => {
    vi.stubEnv("MEMA_INSTALL_MODE", "link");
    await init({ cwd: root, cliRoot, verbose: true });
    for (const args of [["build"], ["add", "-g", "."]]) {
      expect(execFileSync).toHaveBeenCalledWith(
        "pnpm",
        args,
        expect.objectContaining({ cwd: cliRoot, stdio: "inherit" }),
      );
    }
  });

  it.each(["build", "add"])("stops setup when the local %s fails", async (command) => {
    vi.stubEnv("MEMA_INSTALL_MODE", "link");
    failure = command;
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("mema init --verbose");
    expect(existsSync(join(root, NAMES.MEMORIES))).toBe(false);
    expect(execFileSync).not.toHaveBeenCalledWith("npx", expect.anything(), expect.anything());
    if (command === "build") {
      expect(execFileSync).not.toHaveBeenCalledWith("pnpm", ["add", "-g", "."], expect.anything());
    }
  });

  it("rejects unknown install modes before installing or saving setup", async () => {
    vi.stubEnv("MEMA_INSTALL_MODE", "invalid");
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow(
      'Set MEMA_INSTALL_MODE to "registry" or "link"',
    );
    expect(log.step).not.toHaveBeenCalled();
    expect(existsSync(join(root, NAMES.MEMORIES))).toBe(false);
  });

  it("prompts before upgrading a published global CLI", async () => {
    published();
    installed("0.1.0");
    await init({ cwd: root, cliRoot });
    expect(vi.mocked(confirm).mock.calls[5]?.[0].message).toContain("0.1.0 to 0.2.0");
    expect(execFileSync).toHaveBeenCalledWith(
      "npm",
      ["install", "--global", "mema@0.2.0"],
      expect.anything(),
    );
  });

  it("declining an upgrade preserves the global CLI and still initializes the project", async () => {
    published();
    installed("0.1.0");
    vi.mocked(confirm)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    await init({ cwd: root, cliRoot });
    expect(log.step).not.toHaveBeenCalled();
    expect(existsSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON))).toBe(true);
  });

  it("installs the running published version if a first-install upgrade is declined", async () => {
    published();
    vi.mocked(confirm)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    await init({ cwd: root, cliRoot });
    expect(execFileSync).toHaveBeenCalledWith(
      "npm",
      ["install", "--global", "mema@0.1.0"],
      expect.anything(),
    );
  });

  it("cancels an upgrade without writing or installing", async () => {
    published();
    installed("0.1.0");
    vi.mocked(confirm)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(cancelled);
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("cancelled");
    expect(log.step).not.toHaveBeenCalled();
    expect(existsSync(join(root, NAMES.MEMORIES))).toBe(false);
  });

  it("continues with the running version when the registry is unavailable", async () => {
    published();
    failure = "view";
    await init({ cwd: root, cliRoot });
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("Could not check"));
    expect(execFileSync).toHaveBeenCalledWith(
      "npm",
      ["install", "--global", "mema@0.1.0"],
      expect.anything(),
    );
  });

  it("never downgrades a newer installed release", async () => {
    published();
    installed("0.3.0");
    await init({ cwd: root, cliRoot });
    expect(log.step).toHaveBeenCalledExactlyOnceWith("Installing mema-memory-writing globally.");
    expect(confirm).toHaveBeenCalledTimes(5);
  });

  it("refuses to overwrite a different global package using the same name", async () => {
    mkdirSync(join(globalRoot, "mema"), { recursive: true });
    writeFileSync(
      join(globalRoot, "mema", NAMES.PACKAGE_JSON),
      '{"name":"mema","version":"10.0.0"}',
    );
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("not this CLI");
    expect(log.step).not.toHaveBeenCalled();
  });

  it("forwards global install output in verbose mode", async () => {
    await init({ cwd: root, cliRoot, verbose: true });
    expect(execFileSync).toHaveBeenCalledWith(
      "pnpm",
      ["add", "-g", cliRoot],
      expect.objectContaining({ stdio: "inherit" }),
    );
  });

  it.each([
    { agent: "pnpm/11.24.0 npm/? node/v22.0.0", manager: "pnpm", args: ["add", "-g"] },
    { agent: "npm/11.0.0 node/v22.0.0", manager: "npm", args: ["install", "--global"] },
    { agent: "yarn/1.22.22 npm/? node/v22.0.0", manager: "yarn", args: ["global", "add"] },
    { agent: "bun/1.3.0", manager: "bun", args: ["add", "-g"] },
  ])(
    "uses the $manager launcher for installation and version checks",
    async ({ agent, manager, args }) => {
      existing({});
      published();
      vi.stubEnv("npm_config_user_agent", agent);
      installed("0.1.0");
      await init({ cwd: join(web, "src"), cliRoot });
      expect(execFileSync).toHaveBeenCalledWith(
        manager,
        [...args, "mema@0.2.0"],
        expect.objectContaining({ cwd: web }),
      );
      expect(vi.mocked(confirm).mock.calls[2]?.[0].message).toContain("0.1.0 to 0.2.0");
    },
  );

  it("ignores repository lockfiles and packageManager when launched with npx", async () => {
    existing({});
    vi.stubEnv("npm_config_user_agent", "npm/11.0.0 node/v22.0.0");
    writeFileSync(join(root, "pnpm-lock.yaml"), "");
    writeFileSync(join(web, "yarn.lock"), "");
    writeFileSync(join(web, "bun.lock"), "");
    writeFileSync(join(web, NAMES.PACKAGE_JSON), '{"name":"web","packageManager":"bun@1.3.0"}');
    await init({ cwd: web, cliRoot });
    expect(execFileSync).toHaveBeenCalledWith(
      "npm",
      ["install", "--global", cliRoot],
      expect.objectContaining({ cwd: web }),
    );
  });

  it.each([undefined, "unknown/1.0"])(
    "falls back to npm without a recognized launcher (%s)",
    async (agent) => {
      vi.stubEnv("npm_config_user_agent", agent);
      await init({ cwd: root, cliRoot });
      expect(execFileSync).toHaveBeenCalledWith(
        "npm",
        ["install", "--global", cliRoot],
        expect.anything(),
      );
    },
  );

  it.each([undefined, "pnpm/11.24.0 npm/? node/v22.0.0"])(
    "recognizes bunx --bun even with inherited launcher metadata (%s)",
    async (agent) => {
      vi.stubEnv("npm_config_user_agent", agent);
      vi.stubGlobal("process", { ...process, versions: { ...process.versions, bun: "1.3.0" } });
      await init({ cwd: root, cliRoot });
      expect(execFileSync).toHaveBeenCalledWith("bun", ["add", "-g", cliRoot], expect.anything());
    },
  );

  it("uses npm for global installation when launched by yarn dlx", async () => {
    vi.stubEnv("npm_config_user_agent", "yarn/4.9.0 npm/? node/v22.0.0");
    await init({ cwd: root, cliRoot });
    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining("does not support global installs"),
    );
    expect(execFileSync).toHaveBeenCalledWith(
      "npm",
      ["install", "--global", cliRoot],
      expect.anything(),
    );
  });

  it("installs with Bun when no global package.json exists yet", async () => {
    bunMissing = true;
    vi.stubEnv("npm_config_user_agent", "bun/1.3.0");
    await init({ cwd: root, cliRoot });
    expect(execFileSync).toHaveBeenCalledWith("bun", ["add", "-g", cliRoot], expect.anything());
  });

  it("does not mistake a failed Bun lookup for a missing installation", async () => {
    failure = "pm";
    vi.stubEnv("npm_config_user_agent", "bun/1.3.0");
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("Could not pm");
    expect(log.step).not.toHaveBeenCalled();
  });

  it("preserves config changed while the prompts were open", async () => {
    existing({ prune: false });
    vi.mocked(confirm).mockImplementationOnce(async () => {
      writeFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), '{"prune":{"ttl":"500d"}}');
      return true;
    });
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("Settings changed");
    expect(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8")).toBe(
      '{"prune":{"ttl":"500d"}}',
    );
  });

  it("preserves a store created by another init during the prompts", async () => {
    vi.mocked(confirm).mockImplementationOnce(async () => {
      mkdirSync(join(root, NAMES.MEMORIES));
      writeFileSync(join(root, NAMES.MEMORIES, "keep"), "keep");
      return false;
    });
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow();
    expect(readFileSync(join(root, NAMES.MEMORIES, "keep"), "utf8")).toBe("keep");
  });

  it("does not truncate the existing config on a failed write", async () => {
    existing({ prune: false });
    vi.mocked(confirm)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    vi.mocked(writeFileSync).mockImplementationOnce(() => {
      throw new Error("disk full");
    });
    await expect(init({ cwd: root, cliRoot })).rejects.toThrow("disk full");
    expect(readFileSync(join(root, NAMES.MEMORIES, NAMES.CONFIG_JSON), "utf8")).toBe(
      '{"prune":false}',
    );
    expect(readdirSync(join(root, NAMES.MEMORIES))).toEqual([NAMES.CONFIG_JSON]);
  });
});
