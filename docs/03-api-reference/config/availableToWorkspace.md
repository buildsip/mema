---
title: "availableToWorkspace"
---

When `true`, this repository's memories are included when another workspace project [searches](../cli/search.md).

```json
{
  "availableToWorkspace": true
}
```

Set this in [`tiramisu.json`](../file-conventions/tiramisu-json.md). It applies to all memory stores in the repository.

Omitted or `false` excludes these memories when another workspace project searches. Prune reviews only its selected repository, regardless of sharing. Explicit delete and upvote calls can select memories in any Git repository, regardless of this setting. Per-memory `doNotDelete` continues to protect against deletion.

[`tiramisu init`](../cli/init.md) asks whether to share the repository’s memories.

## Related

- [`search`](../cli/search.md)
- [`tiramisu init`](../cli/init.md)
