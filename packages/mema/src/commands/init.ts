import { assertNoSymlinks, findUp, readTextIfExistsSync } from "@buildsip/file-utils";
import type { Command } from "commander";
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { confirm, group, intro, isCancel, log, outro } from "@clack/prompts";
import { applyEdits, findNodeAtLocation, modify, parseTree, type ParseError } from "jsonc-parser";
import { findRepo } from "../find-repo";
import { installCli } from "../install-cli";
import { installWritingSkill } from "../install-writing-skill";
import { prepareInstructions } from "../prepare-instructions";
import type { Config } from "../read-config";
import { NAMES } from "../names";
import { readConfig } from "../read-config";
import { writeText } from "../write-text";
import { getDatabaseUrl } from "../get-database-url";
import { migrateDatabase } from "../migrate-database";
import { promptDatabaseCommand } from "../prompt-database-command";

/**
 * Configures the Git root first, then the nearest package on later runs.
 * Prompts before reconfiguring, preserves existing memories and unrelated settings,
 * and installs the global CLI before saving the chosen configuration.
 *
 * `cliRoot` is the running CLI package directory, not the package being initialized.
 */
export async function init({
  cwd,
  cliRoot,
  verbose = false,
}: {
  cwd: string;
  cliRoot: string;
  verbose?: boolean;
}) {
  const root = await findRepo(cwd);
  // Starting in apps/web/src should configure apps/web, not create a store inside src.
  const nearest =
    (await findUp({
      path: realpathSync(cwd),
      root,
      test: (path) => existsSync(join(path, NAMES.PACKAGE_JSON)),
    })) ?? root;
  // Memories can exist before init runs. Only a root config counts as completed repo setup.
  const repoConfig = await readConfig({ project: root, repo: root });
  const project = repoConfig.source === undefined ? root : nearest;
  // Setup messages use the CLI package's name, regardless of the project being configured.
  const { name } = JSON.parse(readFileSync(join(cliRoot, NAMES.PACKAGE_JSON), "utf8"));
  const memories = join(project, NAMES.MEMORIES);
  const configPath = join(memories, NAMES.CONFIG_JSON);
  await assertNoSymlinks({ path: configPath, base: root });
  const directory = lstatSync(memories, { throwIfNoEntry: false });
  if (directory && !directory.isDirectory()) throw new Error(`Expected a directory: ${memories}`);
  const { config, local, source } =
    project === root ? repoConfig : await readConfig({ project, repo: root });

  intro("mema init");
  if (project !== nearest) {
    log.info(
      `First-time setup: initializing the repository at ${root}. Run mema init again from this package to configure it.`,
    );
  }
  if (source !== undefined) {
    const update = await confirm({
      message: `${name} is already initialized. Reconfigure its settings?`,
      initialValue: false,
    });
    if (isCancel(update)) throw new Error("mema init cancelled.");
    if (!update) {
      outro(`${name} unchanged.`);
      return;
    }
  }
  let url: string | undefined;
  const prune = config.prune || undefined;
  const answers = await group<{
    availableToWorkspace: boolean | symbol | undefined;
    prune: boolean | symbol;
    databaseUrlCommand: string | undefined;
    labels: boolean | symbol;
    skill: boolean | symbol | undefined;
    instructions: boolean | symbol | undefined;
  }>(
    {
      // Returning undefined skips this prompt when initializing a package,
      // because `availableToWorkspace` is only set at the root of a repository.
      availableToWorkspace: () =>
        project === root
          ? confirm({
              message:
                "Make all memories in this repository available to the other projects in this workspace?",
              initialValue: config.availableToWorkspace ?? false,
            })
          : undefined,
      prune: () => confirm({ message: "Enable pruning?", initialValue: Boolean(config.prune) }),
      // Require fresh input on every accepted setup, even if a command is saved or inherited.
      databaseUrlCommand: async ({ results }) => {
        if (!results.prune) return undefined;
        while (true) {
          const command = await promptDatabaseCommand();
          try {
            // Validate before continuing setup; a bad command can be corrected in this run.
            url = await getDatabaseUrl({ repo: root, command });
            return command;
          } catch (error) {
            // getDatabaseUrl hides credentials and command output in its actionable errors.
            log.warn(
              error instanceof Error
                ? error.message
                : "The database command failed. Enter a command that prints one PostgreSQL URL.",
            );
          }
        }
      },
      labels: () =>
        confirm({ message: "Add memory tab labels to VS Code / Cursor?", initialValue: true }),
      skill: () =>
        project === root
          ? confirm({
              message: "Install the global memory-writing skill? Existing copies will be replaced.",
              initialValue: true,
            })
          : undefined,
      instructions: () =>
        project === root
          ? confirm({
              message: `Add starter instructions for when to store or update memories to ${join(root, NAMES.AGENTS_MD)}?`,
              initialValue: true,
            })
          : undefined,
    },
    {
      onCancel: () => {
        throw new Error("mema init cancelled.");
      },
    },
  );
  const next: Config = {
    ...local,
    version: 1,
    // Keep the repo-wide setting out of package config files,
    // because `availableToWorkspace` is only set at the root of a repository.
    ...(project === root ? { availableToWorkspace: answers.availableToWorkspace } : {}),
    // False overrides an enabled ancestor; omitting prune would inherit it.
    prune: answers.prune
      ? {
          ttl: prune?.ttl ?? "90d",
          humanUpvoteAdds: prune?.humanUpvoteAdds ?? "180d",
          agentUpvoteAdds: prune?.agentUpvoteAdds ?? "90d",
          databaseUrlCommand: answers.databaseUrlCommand,
        }
      : false,
  };

  const settingsPath = join(root, NAMES.VSCODE, NAMES.SETTINGS_JSON);
  let settings: string | undefined;
  let previous: string | undefined;
  if (answers.labels) {
    await assertNoSymlinks({ path: settingsPath, base: root });
    previous = readTextIfExistsSync(settingsPath);
    const text = previous ?? "{}\n";
    const errors: ParseError[] = [];
    const tree = parseTree(text, errors, { allowTrailingComma: true, allowEmptyContent: true });
    if (errors.length > 0 || (tree && tree.type !== "object"))
      throw new Error(
        `Cannot update ${settingsPath}: expected a valid JSON object (comments are allowed).`,
      );
    const key = "workbench.editor.customLabels.patterns";
    const patterns = tree && findNodeAtLocation(tree, [key]);
    if (patterns && patterns.type !== "object")
      throw new Error(`Cannot update ${settingsPath}: ${key} must be an object.`);
    // Edit only this property so existing JSONC comments and other settings survive.
    settings = applyEdits(
      text,
      modify(
        text,
        [key, `**/${NAMES.MEMORIES}/**/${NAMES.MEMORY_MD}`],
        `\${dirname}/${NAMES.MEMORY_MD}`,
        {
          formattingOptions: { insertSpaces: true, tabSize: 2, eol: "\n" },
        },
      ),
    );
  }

  // Prepare the append before installing, then reject edits made while installation was running.
  const instructions = answers.instructions
    ? await prepareInstructions({ root, cliRoot })
    : undefined;

  if (url) {
    // The URL was validated by the database prompt. Never persist the URL itself.
    const result = await migrateDatabase({
      url,
      migrationsFolder: join(cliRoot, "dist", "migrations"),
    });
    log.info(
      result.applied
        ? `Applied ${result.applied} database migration(s).`
        : "Database schema is already up to date; no migrations were applied.",
    );
  }

  await installCli({ log }, { cwd: project, cliRoot, verbose });
  if (answers.skill) installWritingSkill({ log }, { cwd: root, cliRoot, verbose });

  // Existing stores may already contain memories created by insert; leave all of those files alone.
  if (!directory) mkdirSync(memories);
  try {
    if (instructions) {
      await assertNoSymlinks({ path: instructions.path, base: root });
      writeText(instructions);
    }
    if (settings !== undefined) {
      mkdirSync(join(root, NAMES.VSCODE), { recursive: true });
      writeText({ path: settingsPath, text: settings, previous });
    }
    writeText({ path: configPath, text: `${JSON.stringify(next, null, 2)}\n`, previous: source });
  } catch (error) {
    if (!directory) {
      // Only remove an empty directory we created; concurrent files must survive a failed init.
      try {
        rmdirSync(memories);
      } catch {
        /* The directory now contains another writer's files. */
      }
    }
    throw error;
  }
  outro(`${name} initialized.`);
}

export function registerInitCommand({ program, cliRoot }: { program: Command; cliRoot: string }) {
  program
    .command("init")
    .description("Initialize memories at the Git root first, then configure the nearest package.")
    .option("--verbose", "Print setup command output.")
    .action(async (options: { verbose?: boolean }) => {
      await init({ cwd: process.cwd(), cliRoot, verbose: options.verbose });
    });
}
