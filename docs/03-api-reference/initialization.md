---
title: Initialization
icon: Sparkles
---

# Automatic (recommended)

```bash package="npm"
npx tiramisu init
```

```bash package="pnpm"
pnpm dlx tiramisu init
```

```bash package="yarn"
yarn dlx tiramisu init
```

```bash package="bun"
bunx tiramisu init
```

`tiramisu init` does the following:

- installs the MCP tools
- writes [`tiramisu.json`](../file-conventions/tiramisu-json.md)
- installs the `tiramisu` package globally
- optionally, installs the `tiramisu-memory-writing` skill
- optionally, adds memory labels to VS Code / Cursor
- if pruning is enabled, it migrates your database
- optionally, adds instructions about when to create a memory to your `AGENTS.md` file

| Options                  | Description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| `--availableToWorkspace` | Share this project's memories with other projects in the workspace. |
| `--verbose`              | Print package-manager output while installing the CLI.              |

> [!TIP]
> `init` detects which agents are installed and adds the MCP server and skill only to those.

# Manual

1. Install the `tiramisu` CLI:

```bash package="npm"
npm i -g tiramisu
```

```bash package="pnpm"
pnpm i -g tiramisu
```

```bash package="yarn"
yarn i -g tiramisu
```

```bash package="bun"
bun i -g tiramisu
```

2. Create `tiramisu.json` at the root of your repository with the [options](config.md) you want:

```json title="tiramisu.json"
{
  "version": 1,
  "availableToWorkspace": false,
  "prune": {
    "unvotedTtl": "90d",
    "humanUpvoteTtl": "180d",
    "agentUpvoteTtl": "90d",
    "databaseUrlCommand": "doppler secrets get TIRAMISU_DATABASE_URL --plain"
  }
}
```

3. Add the MCP tools:

```bash package="npm"
npx add-mcp "tiramisu mcp" --auto-approve
```

```bash package="pnpm"
pnpm dlx add-mcp "tiramisu mcp" --auto-approve
```

```bash package="yarn"
yarn dlx add-mcp "tiramisu mcp" --auto-approve
```

```bash package="bun"
bunx add-mcp "tiramisu mcp" --auto-approve
```

4. Add the memory writing skill:

```bash package="npm"
npx skills add buildsip/tiramisu --global
```

```bash package="pnpm"
pnpm dlx skills add buildsip/tiramisu --global
```

```bash package="yarn"
yarn dlx skills add buildsip/tiramisu --global
```

```bash package="bun"
bunx skills add buildsip/tiramisu --global
```

5. VS Code / Cursor memory tab labels

```json title="vscode/settings.json"
{
  "workbench.editor.customLabels.patterns": {
    "**/.memories/**/memory.md": "${dirname}/memory.md"
  }
}
```

6. If you've enabled pruning, migrate your database using the drizzle schema from `tiramisu/packages/cli/migrations`.
