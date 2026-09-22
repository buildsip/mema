# `availableToWorkspace`

When `true`, this repository's memories are included when another workspace project [searches](../cli/search.md).

```json
{
  "availableToWorkspace": true
}
```

Set this in [`tiramisu.json`](../file-conventions/tiramisu-json.md). It applies to all memory stores in the repository.

Omitted or `false` keeps the memories local to that repo.

[`tiramisu init`](../cli/init.md) asks whether to share the repository’s memories.

## Related

- [`search`](../cli/search.md)
- [`tiramisu init`](../cli/init.md)
