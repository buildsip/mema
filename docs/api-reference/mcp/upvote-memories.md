# upvote-memories

Records upvotes using [`mema upvote`](../cli/upvote.md)'s batch and database rules.

```json
{
  "roots": ["/app", "/team"],
  "repo": "/app",
  "path": ["/app/.memories/data/cache", "/team/.memories/data/releases"],
  "actor": "human"
}
```

## Parameters

| Parameter                                       | Type                 | Required | Description                                                                       |
| ----------------------------------------------- | -------------------- | -------- | --------------------------------------------------------------------------------- |
| [`roots`, `repo`](./index.md#shared-parameters) | —                    | Yes      | Workspace and active repository.                                                  |
| `path`                                          | `string[]`           | Yes      | Nonempty array of available memory directories.                                   |
| `actor`                                         | `"human" \| "agent"` | Yes      | `human` for user-requested upvotes; `agent` when a memory helped produce a reply. |

Updates already record an agent upvote when pruning is enabled. Do not add another upvote for the update alone.

## Returns

One text block containing the CLI's JSON result: `upvoted` lists absolute memory directory paths, and `skipped` lists disabled repositories with their `repo`, selected `paths`, and an explanatory `message`.

Submit mixed batches directly. The CLI upvotes memories whose repositories enable pruning and reports the rest as skipped. If every selected repository has pruning disabled, the call succeeds with `upvoted: []` and the skipped entries. See [batch failures](../cli/upvote.md#reference) before retrying a failed call.
