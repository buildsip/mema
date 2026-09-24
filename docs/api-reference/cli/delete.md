---
title: "tiramisu delete"
---

`tiramisu delete` removes memory folders, including attachments.

```bash filename="Terminal"
tiramisu delete --paths /repo/.memories/staging-db-weekly-reset
```

Stdout is a JSON array of deleted absolute memory directory paths, descendants before parents.

The whole selection is validated before anything is deleted.

## Reference

| Options             | Description                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| `--paths <path...>` | Absolute memory directories containing `memory.md`. Repeatable. Required. |

Paths must be absolute. Duplicate paths are ignored.

Paths may span multiple Git repositories, including private repositories. Each path identifies its owning Git repository; no `--roots` or `--repo` is needed. Only repo and package `.memories` stores are supported. Delete reads the selected memories and checks their descendants without loading unrelated memories or repository configuration. It does not require pruning or access the database.

[`doNotDelete`](../memory/doNotDelete.md) rejects the whole batch. [`doNotEdit`](../memory/doNotEdit.md) does not.

A parent folder that contains another memory is rejected unless that nested memory is also listed in `--paths`.

You cannot delete the [`.memories/`](../file-conventions/memories.md) directory itself.

Delete can remove a memory whose custom fields no longer match the current schema.

## Examples

### Multiple memories

```bash filename="Terminal"
tiramisu delete \
  --paths /repo/.memories/one \
  --paths /repo/.memories/two
```

### Nested memories

```bash filename="Terminal"
tiramisu delete \
  --paths /repo/.memories/parent/nested \
  --paths /repo/.memories/parent
```

Deleting only `parent` fails while `nested` remains.

## Related

- [`search`](./search.md)
- [`doNotDelete`](../memory/doNotDelete.md)
