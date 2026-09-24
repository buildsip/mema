---
title: mcp
---

Starts the [MCP server](../mcp/index.md) over stdio.

```bash title="Terminal"
tiramisu mcp
```

## Reference

This command has no workspace flags. Search, insert, and update calls supply the complete workspace [`roots`](../mcp/index.md#shared-parameters) and an active `repo`. Prune takes only `repo`; delete takes only `paths`; upvote takes `paths` and `actor`.

Stdout is reserved for MCP protocol messages. Setup warnings go to stderr. The process serves requests until the client closes stdin.

For agent configuration, see [MCP installation](../mcp/installation.md).
