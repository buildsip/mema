---
title: Manual Installation
icon: Wrench
---

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

2. Create `tiramisu.json` at the root of your repository with the [options](../02-api-reference/configuration.md) you want:

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

**Option 1: Using `add-mcp`**

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
bunx --bun add-mcp "tiramisu mcp" --auto-approve
```

**Option 2: Manual installation**

Refer to your agent's documentation on how to add a global MCP server.

Add:

```bash
tiramisu mcp
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
bunx --bun skills add buildsip/tiramisu --global
```

5. VS Code / Cursor memory tab labels

```json title="vscode/settings.json"
{
  "workbench.editor.customLabels.patterns": {
    "**/.memories/**/memory.md": "${dirname}/memory.md"
  }
}
```

6. If you've enabled [pruning](./05-upvotes-and-pruning.md), migrate your database using the drizzle schema from [`tiramisu/packages/cli/migrations`](../../packages/cli/migrations).
