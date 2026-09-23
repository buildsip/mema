import { assertNoSymlinks, readTextIfExistsSync } from "@buildsip/file-utils";
import type { Command } from "commander";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { confirm, group, intro, isCancel, log, outro } from "@clack/prompts";
import { applyEdits, findNodeAtLocation, modify, parseTree, type ParseError } from "jsonc-parser";
import { CLI_NAME } from "../cli-name";
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
 * Configures the Git root, even when started inside a nested package.
 * Prompts before reconfiguring, preserves existing memories and unrelated settings,
 * and installs the global CLI before saving the chosen configuration.
 *
 * `cliRoot` is the running CLI package directory, not the package being initialized.
 */
export async function init({
  cwd,
  cliRoot,
  availableToWorkspace = false,
  verbose = false,
}: {
  cwd: string;
  cliRoot: string;
  availableToWorkspace?: boolean;
  verbose?: boolean;
}) {
  const root = await findRepo(cwd);
  const { config, source } = await readConfig(root);
  // Setup messages use the CLI package's name, regardless of the project being configured.
  const { name } = JSON.parse(readFileSync(join(cliRoot, NAMES.PACKAGE_JSON), "utf8"));
  const configPath = join(root, NAMES.TIRAMISU_JSON);

  intro(`${CLI_NAME} init`);
  if (source !== undefined) {
    const update = await confirm({
      message: `${name} is already initialized. Reconfigure its settings?`,
      initialValue: false,
    });
    if (isCancel(update)) throw new Error(`${CLI_NAME} init cancelled.`);
    if (!update) {
      outro(`${name} unchanged.`);
      return;
    }
  }
  let url: string | undefined;
  // Reconfiguration uses the same defaults as first-time setup, not the saved settings.
  const answers = await group<{
    availableToWorkspace: boolean | symbol;
    prune: boolean | symbol;
    databaseUrlCommand: string | undefined;
    labels: boolean | symbol;
    skill: boolean | symbol;
    instructions: boolean | symbol;
  }>(
    {
      // The flag answers only the sharing question; all other prompts still run.
      availableToWorkspace: async () =>
        availableToWorkspace ||
        confirm({
          message:
            "Make all memories in this repository available to the other projects in this workspace?",
          initialValue: false,
        }),
      prune: () => confirm({ message: "Enable pruning?", initialValue: true }),
      // Require fresh input on every accepted root setup, even if a command is saved.
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
        confirm({
          message: "Install the global memory-writing skill? Existing copies will be replaced.",
          initialValue: true,
        }),
      instructions: () =>
        confirm({
          message: `Add starter instructions for when to store or update memories to ${join(root, NAMES.AGENTS_MD)}?`,
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        throw new Error(`${CLI_NAME} init cancelled.`);
      },
    },
  );
  // Preserve the custom schema while replacing the settings chosen during setup.
  const next: Config = {
    ...config,
    version: 1,
    availableToWorkspace: answers.availableToWorkspace,
    prune: answers.prune
      ? {
          unvotedTtl: "90d",
          humanUpvoteTtl: "180d",
          agentUpvoteTtl: "90d",
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

  await installCli({ log }, { cwd: root, cliRoot, verbose });
  if (answers.skill) installWritingSkill({ log }, { cwd: root, cliRoot, verbose });

  if (instructions) {
    await assertNoSymlinks({ path: instructions.path, base: root });
    writeText(instructions);
  }
  if (settings !== undefined) {
    mkdirSync(join(root, NAMES.VSCODE), { recursive: true });
    writeText({ path: settingsPath, text: settings, previous });
  }
  // Recheck after prompts and installation; the config path may have changed in the meantime.
  await assertNoSymlinks({ path: configPath, base: root });
  writeText({ path: configPath, text: `${JSON.stringify(next, null, 2)}\n`, previous: source });
  outro(`${name} initialized.`);
}

export function registerInitCommand({ program, cliRoot }: { program: Command; cliRoot: string }) {
  program
    .command("init")
    .description(`Initialize ${CLI_NAME}.`)
    .option(
      "--availableToWorkspace",
      "Share this repository's memories with the workspace.",
    )
    .option("--verbose", "Print setup command output.")
    .action(async (options: { availableToWorkspace?: boolean; verbose?: boolean }) => {
      await init({
        cwd: process.cwd(),
        cliRoot,
        availableToWorkspace: options.availableToWorkspace,
        verbose: options.verbose,
      });
    });
}
