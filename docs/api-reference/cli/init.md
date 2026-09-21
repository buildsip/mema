# mema init

`mema init` writes [`.memories/config.json`](../file-conventions/config-json.md) and installs the global `mema` CLI. Run it from anywhere inside a Git working tree.

Like every CLI invocation, it also refreshes [global MCP installation](../mcp/installation.md), even if memory reconfiguration is skipped.

```bash filename="Terminal"
mema init
```

```bash filename="Terminal"
mema init --verbose
```

## Reference

| Options     | Description                                            |
| ----------- | ------------------------------------------------------ |
| `--verbose` | Print package-manager output while installing the CLI. |

`init` does not take [`--roots`](./index.md#--roots) or [`--repo`](./index.md#--repo).

### Target

The Git root is the directory that contains `.git`.

If that root has no `.memories/config.json`, init configures the Git root even when launched inside a nested package. An existing `.memories/` folder without that file does not count as repository setup.

Once the root config exists, init configures the nearest directory that contains `package.json`, walking up from the current working directory and stopping at the Git root. Starting in `apps/web/src` therefore configures `apps/web`.

Run init again from the same package after first-time repository setup to create that package's own config.

### Prompts

Existing memories and unrelated config keys are left alone. The target's config and inherited configs are validated before prompting.

| Prompt                                                                                 | When                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reconfigure this target?                                                               | The target already has a config. Default `false`. Answering no leaves memory settings unchanged.                                                                                                       |
| Share this repository's memories with other projects in the workspace?                 | Configuring the Git root. Default is the current [`availableToWorkspace`](../config/availableToWorkspace.md) value, or `false`.                                                                        |
| Enable pruning?                                                                        | Always. Default is whether [`prune`](../config/prune.md) is currently an object.                                                                                                                       |
| Full database URL command                                                              | Immediately after enabling pruning, on every accepted root or package setup. Requires fresh input; blank input is rejected and saved commands are not defaults. No database URL is requested or saved. |
| Add memory tab labels to VS Code / Cursor?                                             | Always. Default `true`.                                                                                                                                                                                |
| Install the global memory-writing skill?                                               | Configuring the Git root. Default `true`. Reinstalls the bundled skill even if an older copy is already installed.                                                                                     |
| Add starter instructions for when to store or update memories to the root `AGENTS.md`? | Configuring the Git root. Default `true`. Independent of skill installation.                                                                                                                           |

Canceling any prompt exits with `mema init cancelled.`

If pruning is enabled, init executes the newly entered [database command](../config/databaseUrlCommand.md) and
applies pending [database migrations](../database.md) before saving configuration. Repeated
initialization of a shared database skips migrations already recorded in its history, even
when that database contains data. Failures stop setup before writing its configuration.
Pruning disabled or reconfiguration declined means no credential command or migration runs.

Credential-command failures or invalid URL output show an error and prompt for another command
in the same init run. Cancel to stop without saving config. See the [output contract](../config/databaseUrlCommand.md).

### Written files

Root config always includes `version: 1` and `availableToWorkspace`. Package config omits `availableToWorkspace`.

The newly entered command replaces `prune.databaseUrlCommand` in the target's config. Saved or
inherited commands are never used as defaults during init. Package setup leaves the root config
unchanged, including when pruning is disabled at the root. Commands always run from the Git root.

Enabled [`prune`](../config/prune.md) uses init's default durations, keeping any existing durations already on the target. Disabled pruning is `false`.

Tab labels edit `.vscode/settings.json` at the Git root (JSONC comments are preserved):

```json
{
  "workbench.editor.customLabels.patterns": {
    "**/.memories/**/memory.md": "${dirname}/memory.md"
  }
}
```

`data/` is not created here. See [`data/`](../file-conventions/data.md).

If accepted, starter instructions are appended to the root `AGENTS.md`, creating it if needed. Existing text is preserved. The added section explains when to insert or update a memory and refers to the writing skill if installed. Keep its `<!-- mema:instructions -->` marker when customizing it: later init runs leave that section unchanged. The writing guidelines themselves are not added to `AGENTS.md`.

### Writing skill

After consent, init runs `npx --yes skills add <bundled-skill-path> --global --yes` to install `mema-memory-writing` through Vercel's Skills CLI. The skill ships with the mema package, so installation uses the guidelines from the running version. Accepted installations replace previous copies, including when setting up another repository.

The skill and starter instructions are offered during repository setup or accepted root reconfiguration, not package-only setup. Installation failures stop setup before its files are written; retry with `mema init --verbose` or decline skill installation to continue without it.

To install the skill separately:

```bash filename="Terminal"
npx skills add https://github.com/buildsip/mema/tree/main/packages/mema/skills/mema-memory-writing --global
```

### CLI install

Init installs `mema` globally with the launcher that invoked it (`npx` → npm, `pnpm dlx` → pnpm, `bunx --bun` → bun). Direct invocation without launcher metadata uses npm. Yarn Berry uses npm for the global install; Yarn Classic uses `yarn global add`.

A private development package is installed from the running CLI directory. A published package is installed from the registry. If a newer release exists, init asks before upgrading.

For local development, create `packages/mema/.env`:

```dotenv filename="packages/mema/.env"
MEMA_INSTALL_MODE=link
```

The CLI loads `.env` from its own package directory, regardless of the current working directory. Existing environment variables take precedence. The file is ignored by Git and excluded from the published package.

Then run from the source repository:

```bash filename="Terminal"
pnpm --dir packages/mema mema init
```

Link mode runs `pnpm build` followed by `pnpm add -g .` from the running CLI package directory. It skips registry checks and refreshes the global link on every accepted setup, even if the installed version is equal or newer. The bundled writing skill is installed from the same local package when accepted. pnpm must be installed and its global bin directory must be on `PATH`; use `pnpm setup` and restart the shell if needed.

Unset `MEMA_INSTALL_MODE` or set it to `registry` for the normal installation behavior. Other values stop setup with an error.

## Examples

### First run inside a package

```bash filename="Terminal"
cd apps/web
mema init
```

Writes `/repo/.memories/config.json`. The UI tells you to run init again from this package to configure it.

```bash filename="Terminal"
mema init
```

Writes `/repo/apps/web/.memories/config.json` without `availableToWorkspace`.

### Reconfigure the Git root

```bash filename="Terminal"
cd /repo
mema init
```

Confirms before overwriting that root config. Existing `memory.md` files stay.

## Related

- [`.memories/config.json`](../file-conventions/config-json.md)
- [`availableToWorkspace`](../config/availableToWorkspace.md)
- [`prune`](../config/prune.md)
