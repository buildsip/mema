# tiramisu init

`tiramisu init` writes [`tiramisu.json`](../file-conventions/tiramisu-json.md) and installs the `tiramisu` package globally. Run it from anywhere inside a Git working tree.

Like every CLI invocation, it also refreshes [global MCP installation](../mcp/installation.md), even if memory reconfiguration is skipped.

```bash filename="Terminal"
tiramisu init
```

```bash filename="Terminal"
tiramisu init --verbose
```

```bash filename="Terminal"
tiramisu init --availableToWorkspace
```

## Reference

| Options                  | Description                                                   |
| ------------------------ | ------------------------------------------------------------- |
| `--availableToWorkspace` | Answer yes to sharing memories with other workspace projects. |
| `--verbose`              | Print package-manager output while installing the CLI.        |

`--availableToWorkspace` skips the sharing question and saves `availableToWorkspace: true`. Other prompts still run, including the reconfiguration prompt for an existing setup.

`init` does not take [`--roots`](./index.md#--roots) or [`--repo`](./index.md#--repo).

### Target

Setup always targets the Git root, including when started from a nested package or its source directory. The root is the directory containing `.git` (a directory in a normal clone, or a file in a worktree).

An existing `tiramisu.json` triggers the reconfiguration prompt. Package manifests and memory stores do not change the target.

### Prompts

Setup uses the same defaults on every run, including reconfiguration. Existing memories and unrelated config keys are left alone. The root config is validated before prompting.

| Prompt                                                                                 | When                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reconfigure the repository?                                                            | `tiramisu.json` already exists. Default `false`. Answering no leaves memory settings unchanged.                                                                                        |
| Share this repository's memories with other projects in the workspace?                 | Skipped and answered yes with `--availableToWorkspace`; otherwise defaults to `false`. See [`availableToWorkspace`](../config/availableToWorkspace.md).                                |
| Enable pruning?                                                                        | Default `true`. See [`prune`](../config/prune.md).                                                                                                                                     |
| Full database URL command                                                              | Immediately after enabling pruning, on every accepted setup. Requires fresh input; blank input is rejected and saved commands are not defaults. No database URL is requested or saved. |
| Add memory tab labels to VS Code / Cursor?                                             | Always. Default `true`.                                                                                                                                                                |
| Install the global memory-writing skill?                                               | Default `true`. Reinstalls the bundled skill even if an older copy is already installed.                                                                                               |
| Add starter instructions for when to store or update memories to the root `AGENTS.md`? | Default `true`. Independent of skill installation.                                                                                                                                     |

Canceling any prompt exits with `tiramisu init cancelled.`

When pruning is enabled, init executes the newly entered [database command](../config/databaseUrlCommand.md) and
applies pending [database migrations](../database.md) before saving configuration. Repeated
initialization of a shared database skips migrations already recorded in its history, even
when that database contains data. Failures stop setup before writing its configuration.
Pruning disabled or reconfiguration declined means no credential command or migration runs.

Credential-command failures or invalid URL output show an error and prompt for another command
in the same init run. Cancel to stop without saving config. See the [output contract](../config/databaseUrlCommand.md).

### Written files

`tiramisu.json` always includes `version: 1`, `availableToWorkspace`, and `prune`. The existing custom frontmatter schema is preserved.

The newly entered command replaces `prune.databaseUrlCommand`. Saved commands are never used as defaults during init.

Enabled [`prune`](../config/prune.md) replaces existing durations with `unvotedTtl: "90d"`, `humanUpvoteTtl: "180d"`, and `agentUpvoteTtl: "90d"`. Disabled pruning is `false`.

Tab labels edit `.vscode/settings.json` at the Git root (JSONC comments are preserved):

```json
{
  "workbench.editor.customLabels.patterns": {
    "**/.memories/**/memory.md": "${dirname}/memory.md"
  }
}
```

Memory stores are created on the first insert. See [`.memories`](../file-conventions/memories.md).

If accepted, starter instructions are appended to the root `AGENTS.md`, creating it if needed. Existing text is preserved. The added section explains when to insert or update a memory and refers to the writing skill if installed. Keep its `<!-- tiramisu:instructions -->` marker when customizing it: later init runs leave that section unchanged. The writing guidelines themselves are not added to `AGENTS.md`.

### Writing skill

After consent, init runs `npx --yes skills add <bundled-skill-path> --global --yes` to install `tiramisu-memory-writing` through Vercel's Skills CLI. The skill ships with the tiramisu package, so installation uses the guidelines from the running version. Accepted installations replace previous copies, including when setting up another repository.

Installation failures stop setup before its files are written; retry with `tiramisu init --verbose` or decline skill installation to continue without it.

To install the skill separately:

```bash filename="Terminal"
npx skills add buildsip/tiramisu --global
```

### CLI install

Init installs `tiramisu` globally with the launcher that invoked it (`npx` → npm, `pnpm dlx` → pnpm, `bunx --bun` → bun). Direct invocation without launcher metadata uses npm. Yarn Berry uses npm for the global install; Yarn Classic uses `yarn global add`.

A private development package is installed from the running CLI directory. A published package is installed from the registry. If a newer release exists, init asks before upgrading.

For local development, create `packages/cli/.env`:

```dotenv filename="packages/cli/.env"
TIRAMISU_INSTALL_MODE=link
```

The CLI loads `.env` from its own package directory, regardless of the current working directory. Existing environment variables take precedence. The file is ignored by Git and excluded from the published package.

Then run from the source repository:

```bash filename="Terminal"
bun run --cwd packages/cli tiramisu init
```

Link mode runs `bun run build` followed by `bun add -g .` from the running CLI package directory. It skips registry checks and refreshes the global link on every accepted setup, even if the installed version is equal or newer. The bundled writing skill is installed from the same local package when accepted. Bun must be installed and its global bin directory must be on `PATH`; use `bun pm bin -g` to locate it.

Unset `TIRAMISU_INSTALL_MODE` or set it to `registry` for the normal installation behavior. Other values stop setup with an error.

## Examples

### Initialize from a package

```bash filename="Terminal"
cd /repo/apps/web/src
tiramisu init
```

Creates `/repo/tiramisu.json`. Running the same command again offers to reconfigure that file. Existing `memory.md` files stay in their stores.

## Related

- [`tiramisu.json`](../file-conventions/tiramisu-json.md)
- [`availableToWorkspace`](../config/availableToWorkspace.md)
- [`prune`](../config/prune.md)
