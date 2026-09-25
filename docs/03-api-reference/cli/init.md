---
title: init
icon: Sparkles
---

`tiramisu init` writes [`tiramisu.json`](../file-conventions/tiramisu-json.md) and installs the `tiramisu` package globally. Run it from anywhere inside a Git working tree.

Like every CLI invocation, it also refreshes [global MCP installation](../mcp/installation.md), while preserving existing memory settings.

```bash title="Terminal"
tiramisu init
```

```bash title="Terminal"
tiramisu init --verbose
```

```bash title="Terminal"
tiramisu init --availableToWorkspace
```

## Reference

| Options                  | Description                                                   |
| ------------------------ | ------------------------------------------------------------- |
| `--availableToWorkspace` | Answer yes to sharing memories with other workspace projects. |
| `--verbose`              | Print package-manager output while installing the CLI.        |

`--availableToWorkspace` skips the sharing question and saves `availableToWorkspace: true`. On repeated runs, sharing is otherwise preserved without a prompt.

`init` does not take [`--roots`](./index.md#--roots) or [`--repo`](./index.md#--repo).

### Target

Setup always targets the Git root, including when started from a nested package or its source directory. The root is the directory containing `.git` (a directory in a normal clone, or a file in a worktree).

An existing `tiramisu.json` is preserved unless you enable disabled pruning or explicitly pass `--availableToWorkspace`. Package manifests and memory stores do not change the target.

### Prompts

First-time setup asks about sharing and pruning. Repeated runs preserve saved settings, including
custom pruning durations and the database command. The root config is validated before prompting.
There is no general reconfiguration prompt.

| Prompt                                                                                  | When                                                                                              |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Make all memories in this repository available to the other projects in this workspace? | First setup only, unless `--availableToWorkspace` is passed. Default No.                          |
| Enable pruning?                                                                         | First setup only. Default Yes.                                                                    |
| Pruning is disabled. Enable?                                                            | Repeated setup when `prune` is false or omitted. Default No.                                      |
| Full database URL command                                                               | Immediately after opting into pruning. Blank input is rejected. No URL is requested or saved.     |
| Add memory tab labels to VS Code / Cursor?                                              | Only when the memory label is missing or empty. Default No. Existing custom labels are preserved. |
| Add default instructions to AGENTS.md?                                                  | No marked Tiramisu section exists. Default No.                                                    |
| You have Tiramisu instructions in AGENTS.md. Override with default instructions?        | A marked Tiramisu section already exists. One prompt on one line, default No.                     |

MCP installation refreshes automatically. Every run asks `Install the global memory-writing skill?`, with Yes selected. Accepting installs or refreshes the skill; declining leaves existing copies untouched.

Canceling any prompt exits with `tiramisu init cancelled.`

When pruning is enabled, init executes the saved or newly entered [database command](../config/databaseUrlCommand.md) and
applies pending [database migrations](../database.md) before saving configuration. Repeated
initialization of a shared database skips migrations already recorded in its history, even
when that database contains data. Failures stop setup before writing its configuration.
Keeping pruning disabled means no credential command or migration runs.

When collecting a new command, failures or invalid URL output prompt for another command in the
same run. A failing saved command stops setup with instructions to fix `prune.databaseUrlCommand`
and rerun init. See the [output contract](../config/databaseUrlCommand.md).

### Written files

First setup writes `version: 1`, `availableToWorkspace`, and `prune` to `tiramisu.json`.
Repeated setup preserves existing fields, including the custom frontmatter schema, and leaves the
file byte-for-byte unchanged when no config option changes.

Enabling disabled pruning saves the entered command and initial durations of `unvotedTtl: "90d"`,
`humanUpvoteTtl: "180d"`, and `agentUpvoteTtl: "90d"`. Already-enabled pruning keeps its command
and durations. Edit `tiramisu.json` directly to change these settings or disable pruning.

Tab labels edit `.vscode/settings.json` at the Git root (JSONC comments are preserved):

```json
{
  "workbench.editor.customLabels.patterns": {
    "**/.memories/**/memory.md": "${dirname}/memory.md"
  }
}
```

Memory stores are created on the first insert. See [`.memories`](../file-conventions/memories.md).

If accepted, starter instructions are appended to the root `AGENTS.md`, creating it if needed. Existing text is preserved. The added section explains when to insert or update a memory and refers to the writing skill. Keep the `<!-- tiramisu -->` and `<!-- /tiramisu -->` markers when customizing it. Later runs ask before replacing only that section; declining preserves it. Text outside the markers and existing line endings are preserved. The writing guidelines themselves are not added to `AGENTS.md`.

### Writing skill

After accepting, init detects installed agents using `add-mcp` and runs `npx --yes skills add <bundled-skill-path> --global --yes --agent <detected-agent-ids...>` to install `tiramisu-memory-writing` through Vercel's Skills CLI. The skill ships with the tiramisu package, so installation uses the guidelines from the running version. Accepted installations replace previous copies, including when setting up another repository. The same question appears every time; init does not check whether the skill is already installed.

Explicit agent targets include agents such as Claude Code that use their own skill directories. Init maps differing agent IDs (for example, `github-copilot-cli` and `vscode` both use the Skills target `github-copilot`) and removes duplicates. Detected agents without a Skills target are reported and skipped. If no supported agents are detected, init reports that the skill was not installed and continues without running the installer.

Installation failures stop setup before its files are written; fix the installation issue and retry with `tiramisu init --verbose`, or decline skill installation to continue without it.

To install the skill separately:

```bash title="Terminal"
npx skills add buildsip/tiramisu --global
```

### CLI install

For published packages, init installs `tiramisu` globally with the launcher that invoked it (`npx` → npm, `pnpm dlx` → pnpm, `bunx --bun` → bun). Direct invocation without launcher metadata uses npm. Yarn Berry uses npm for the global install; Yarn Classic uses `yarn global add`.

A source checkout builds and links locally when the running CLI package contains both `src/index.ts` and `scripts/build.mjs`. Detection uses the CLI's own directory, not the project being initialized. These files are excluded from the npm package, so a published installation uses the registry. If a newer release exists, a registry install asks before upgrading. Private packages use the local package directory instead of the registry.

Run from the source repository:

```bash title="Terminal"
bun run --cwd packages/cli tiramisu init
```

A source checkout runs `bun run build` followed by `bun link` from the running CLI package directory. It skips registry checks and refreshes the global link on every setup, even if the installed version is equal or newer. If accepted, the bundled writing skill is refreshed from the same local package for detected supported agents. Bun must be installed and its global bin directory must be on `PATH`; use `bun pm bin -g` to locate it.

## Examples

### Initialize from a package

```bash title="Terminal"
cd /repo/apps/web/src
tiramisu init
```

Creates `/repo/tiramisu.json`. Running the same command again preserves existing settings and offers to enable disabled pruning or add missing integrations. Existing `memory.md` files stay in their stores.

## Related

- [`tiramisu.json`](../file-conventions/tiramisu-json.md)
- [`availableToWorkspace`](../config/availableToWorkspace.md)
- [`prune`](../config/prune.md)
