# prune-memories

Lists candidates using [`mema prune`](../cli/prune.md)'s discovery and expiry rules. Call only when the user requests pruning or a review of unused memories.

```json
{
  "roots": ["/app", "/team"],
  "repo": "/app"
}
```

## Parameters

| Parameter                                       | Required | Description                      |
| ----------------------------------------------- | -------- | -------------------------------- |
| [`roots`, `repo`](./index.md#shared-parameters) | Yes      | Workspace and active repository. |

No scope or pagination parameters are accepted.

## Returns

One text block containing a JSON array of absolute memory directory paths. The tool never deletes files.

Read the candidates, check relevance against the code, and suggest which to delete or keep. Contradictions found during ordinary search should be reported to the user with an offer to update or delete; they do not require prune.
