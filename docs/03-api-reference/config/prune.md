---
title: "prune"
---

Repository-wide settings for upvotes and pruning. Omit the field or use `false` to disable both.

```json title="tiramisu.json"
{
  "prune": {
    "databaseUrlCommand": "doppler secrets get MEMORIES_DATABASE_URL --plain",
    "unvotedTtl": "90d",
    "humanUpvoteTtl": "180d",
    "agentUpvoteTtl": "90d"
  }
}
```

## Reference

| Field                                           | Default  | Description                                                                       |
| ----------------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| [`databaseUrlCommand`](./databaseUrlCommand.md) | —        | Shell command that prints one PostgreSQL URL. Required to run enabled operations. |
| `unvotedTtl`                                    | `"90d"`  | Lifetime from the memory's [`created`](../memory/created.md) date.                |
| `humanUpvoteTtl`                                | `"180d"` | Lifetime from its last human upvote.                                              |
| `agentUpvoteTtl`                                | `"90d"`  | Lifetime from its last agent upvote.                                              |

Durations accept positive whole-day strings such as `"1d"` or `"90d"`. Zero, fractions, hours, weeks, whitespace, leading zeros, and values exceeding the safe integer range in milliseconds are rejected.

Configure `prune` in [`tiramisu.json`](../file-conventions/tiramisu-json.md). Unknown keys and `true` are rejected.

## Expiry

A memory becomes eligible when the current time reaches the latest of:

- [`created`](../memory/created.md) + `unvotedTtl`.
- Last human upvote + `humanUpvoteTtl`, if one exists.
- Last agent upvote + `agentUpvoteTtl`, if one exists.

Upvotes do not stack. A later agent vote cannot shorten a human lifetime. Durations apply at read time, so changing config changes eligibility without rewriting votes.

Editing, renaming, or moving the file does not change `created`.

Expiry only makes a memory a [`prune`](../cli/prune.md) candidate. It does not hide search results or delete files.

## Setup

Run [`tiramisu init`](../cli/init.md) from anywhere in the repository to enable pruning, configure credentials, and apply pending migrations. Runtime operations never migrate automatically.
