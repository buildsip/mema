---
title: prune
icon: Scissors
---

`tiramisu prune` lists every expired, unprotected memory directory in the selected repository for review. It never deletes anything.

```bash title="Terminal"
tiramisu prune --repo /app
```

```json
["/app/.memories/old-cache-rule", "/app/packages/web/.memories/previous-release-process"]
```

## Reference

| Option                               | Description                                             |
| ------------------------------------ | ------------------------------------------------------- |
| [`--repo <path>`](./index.md#--repo) | Absolute Git root of the repository to prune. Required. |

Discovery includes the selected repository's root and package memory stores, regardless of memory scopes. Other repositories are not included, even when they enable workspace sharing. There is no scope, limit, offset, or result cap. Results contain only absolute memory directory paths, deduplicated and sorted by path.

The selected repository uses its Git root's [`prune` settings](../config/prune.md#expiry) and database. If pruning is disabled, the command returns instructions to enable it. Credential or database failures fail the call without returning a partial list.

Memories with [`doNotDelete`](../memory/doNotDelete.md) are excluded. `doNotEdit` does not affect eligibility.

Review the candidates against current code before choosing [`delete`](./delete.md), [`update`](./update.md), or [`upvote`](./upvote.md). Expiry alone does not establish that a memory is wrong.
