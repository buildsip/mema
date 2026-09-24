---
title: "update-memory"
---

Patches one memory using [`tiramisu update`](../cli/update.md)'s validation and movement rules.

```json
{
  "roots": ["/workspace/app"],
  "repo": "/workspace/app",
  "path": "/workspace/app/.memories/cache",
  "body": "Invalidate cached responses when permissions change."
}
```

## Parameters

| Parameter                                       | Type     | Required | Description                                                                                                                                    |
| ----------------------------------------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [`roots`, `repo`](./index.md#shared-parameters) | —        | Yes      | Workspace and active repository.                                                                                                               |
| `path`                                          | `string` | Yes      | Absolute path to an existing memory directory containing `memory.md`. Reuse a returned path; relative paths are rejected. |
| `body`                                          | `string` | No       | Replacement Markdown body.                                                                                                                     |
| `frontmatter`                                   | `object` | No       | Memory metadata and configured custom fields. See [update input](../cli/update.md#input).                                                      |

Omitted fields retain their values. A path-only call repairs the title folder. [`doNotEdit`](../memory/doNotEdit.md) blocks updates, including attempts to remove that protection.

## Returns

A JSON array containing the resulting absolute memory directory path, followed by a second text block with [categorization guidance and the destination store's directory listing](./index.md#categorization-guidance). Scope and title changes can move the memory; use the returned path for later calls, or the new path if you categorize it afterward.

Every successful update also follows the CLI’s [agent upvote behavior](../cli/update.md#agent-upvotes), including recovery when saving succeeds but recording the vote fails.
