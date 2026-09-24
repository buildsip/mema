---
title: "prune-memories"
---

Lists candidates using [`tiramisu prune`](../cli/prune.md)'s discovery and expiry rules. Call only when the user requests pruning or a review of unused memories.

```json
{
  "repo": "/app"
}
```

## Parameters

| Parameter                              | Required | Description                                   |
| -------------------------------------- | -------- | --------------------------------------------- |
| [`repo`](./index.md#shared-parameters) | Yes      | Absolute Git root of the repository to prune. |

Only this repository's root and package memory stores are considered. No `roots`, scope, or pagination parameters are accepted.

## Returns

The first text block contains a JSON array of absolute memory directory paths. When candidates exist, a second text block instructs the agent to read them, check their relevance against the code, and suggest which to delete or keep. An empty result returns only the JSON block. The tool never deletes files.

Read the candidates, check relevance against the code, and suggest which to delete or keep. Contradictions found during ordinary search should be reported to the user with an offer to update or delete; they do not require prune.
