---
title: "delete-memories"
icon: Trash
---

Deletes selected memories and their attachments using [`tiramisu delete`](../cli/delete.md)'s batch validation rules.

```json
{
  "paths": ["/workspace/app/.memories/cache"]
}
```

## Parameters

| Parameter | Type       | Required | Description                                                                                                           |
| --------- | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `paths`   | `string[]` | Yes      | Nonempty array of absolute memory directory paths. Reuse paths returned by memory tools; relative paths are rejected. |

The whole selection is validated before deletion. [`doNotDelete`](../memory/doNotDelete.md) blocks the batch. Nested memories must be selected explicitly when deleting their parent folder.

Paths may span multiple Git repositories, including private repositories. The tool determines ownership from each absolute path; do not pass `roots` or `repo`. Only repo and package `.memories` stores are supported. Unrelated memories are not loaded.

## Returns

A JSON array of deleted absolute memory directory paths, with descendants before parents.
