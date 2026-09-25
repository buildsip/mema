---
title: "upvote-memories"
icon: ThumbsUp
---

Records upvotes using [`tiramisu upvote`](../cli/upvote.md)'s batch and database rules.

```json
{
  "paths": ["/app/.memories/cache", "/team/.memories/releases"],
  "actor": "human"
}
```

## Parameters

| Parameter | Type                 | Required | Description                                                                                                           |
| --------- | -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `paths`   | `string[]`           | Yes      | Nonempty array of absolute memory directory paths. Reuse paths returned by memory tools; relative paths are rejected. |
| `actor`   | `"human" \| "agent"` | Yes      | `human` for user-requested upvotes; `agent` when a memory helped produce a reply.                                     |

Updates already record an agent upvote when pruning is enabled. Do not add another upvote for the update alone.

Paths may span multiple Git repositories, including private repositories. The tool determines ownership from each absolute path; do not pass `roots` or `repo`. Only repo and package `.memories` stores are supported. Unrelated memories are not loaded.

## Returns

One text block containing the CLI's JSON result: `upvoted` lists absolute memory directory paths, and `skipped` lists disabled repositories with their `repo`, selected `paths`, and an explanatory `message`.

Submit mixed batches directly. The CLI upvotes memories whose repositories enable pruning and reports the rest as skipped. If every selected repository has pruning disabled, the call succeeds with `upvoted: []` and the skipped entries. See [batch failures](../cli/upvote.md#reference) before retrying a failed call.
