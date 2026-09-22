# tiramisu prune

`tiramisu prune` lists every expired, unprotected memory directory for review. It never deletes anything.

```bash filename="Terminal"
tiramisu prune --roots /app /team --repo /app
```

```json
["/app/.memories/data/old-cache-rule", "/team/.memories/data/previous-release-process"]
```

## Reference

| Option                                    | Description                          |
| ----------------------------------------- | ------------------------------------ |
| [`--roots <path...>`](./index.md#--roots) | Every workspace directory. Required. |
| [`--repo <path>`](./index.md#--repo)      | Active Git root. Required.           |

Discovery follows an unscoped [`search`](./search.md). There is no scope, limit, offset, or result cap. Results contain only absolute memory directory paths, deduplicated and sorted by path.

Each root uses its own [`prune` settings](../config/prune.md#expiry) and database. Disabled roots are skipped, even when the active repo is disabled. If every available root is disabled, the command errors. Any enabled root's credential or database failure fails the whole call without returning a partial list.

Memories with [`doNotDelete`](../memory/doNotDelete.md) are excluded. `doNotEdit` does not affect eligibility.

Review the candidates against current code before choosing [`delete`](./delete.md), [`update`](./update.md), or [`upvote`](./upvote.md). Expiry alone does not establish that a memory is wrong.
