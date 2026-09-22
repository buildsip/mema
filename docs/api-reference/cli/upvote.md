# tiramisu upvote

`tiramisu upvote` records a batch of human or agent upvotes.

```bash filename="Terminal"
tiramisu upvote --roots /app /team --repo /app \
  --path /app/.memories/data/cache /team/.memories/data/releases \
  --actor human
```

Stdout is a JSON object with `upvoted` (absolute memory directory paths) and `skipped` (one entry per disabled repository, containing `repo`, `paths`, and an explanatory `message`). Duplicate paths are ignored.

```json
{
  "upvoted": ["/app/.memories/data/cache"],
  "skipped": [
    {
      "repo": "/team",
      "paths": ["/team/.memories/data/releases"],
      "message": "These memories could not be upvoted because pruning is disabled in /team. Tell the user these memories were skipped; retry them only after pruning is enabled for this repository."
    }
  ]
}
```

The command succeeds even when every selected memory is skipped, returning an empty `upvoted` array without opening a database connection.

## Reference

| Option                                    | Description                             |
| ----------------------------------------- | --------------------------------------- |
| [`--roots <path...>`](./index.md#--roots) | Every workspace directory. Required.    |
| [`--repo <path>`](./index.md#--repo)      | Active Git root. Required.              |
| `--path <path...>`                        | Memory directories to upvote. Required. |
| `--actor <human\|agent>`                  | One actor for the batch. Required.      |

Use `human` when the user requested the upvote and `agent` when the memory helped produce a reply. Reading alone does not warrant an upvote. Both protection flags permit upvotes.

Paths follow [`search`](./search.md)'s visibility: the active repo plus available workspace repositories. Relative paths resolve from the working directory. The CLI checks each selected repo's root [`prune`](../config/prune.md) setting. Omitted or `false` pruning skips that repo's memories while eligible repos still receive upvotes. Callers do not need to filter disabled repos before submitting a batch.

All paths and configurations are validated first; invalid paths or malformed enabled pruning settings still fail before any writes. Each eligible repository's votes are written in one database transaction. Separate repositories are not one transaction: a later failure returns an error, but earlier repositories may already have votes. Retry after fixing the failure; votes do not stack, though a retry records a new event at the retry time.

Database failures return instructions to check credentials, permissions, or rerun root [`init`](./init.md). No migrations run during upvote.
