---
title: "tiramisu.json"
icon: FileBraces
---

## availableToWorkspace

`availableToWorkspace` makes all memories in a repository available to all other projects in the workspace.

To enable the `availableToWorkspace` flag, set it to `true` in your `tiramisu.json` file:

```json title="tiramisu.json"
{
  "availableToWorkspace": true
}
```

## frontmatter

### custom

`custom` allows you to use custom frontmatter fields with your `memory.md` files.

Define a JSON schema in your `tiramisu.json` file:

```json title="tiramisu.json"
{
  "frontmatter": {
    "custom": {
      "properties": {
        "anchors": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "linear": {
          "type": "string"
        }
      },
      "required": ["anchors"],
      "additionalProperties": false
    }
  }
}
```

> [!TIP]
> Existing memories remain searchable when you add, change, or remove custom fields. Only newly created or edited memories will be required to comply with the new schema.

## prune

To enable [pruning](./01-getting-started.md#step-1-configure-pruning-optional), update your `tiramisu.json` file:

```json file="tiramisu.json"
{
  "prune": {
    "unvotedTtl": "90d",
    "humanUpvoteTtl": "180d",
    "agentUpvoteTtl": "90d"
  }
}
```

### Lifetimes

| Name             | Description                                        |
| ---------------- | -------------------------------------------------- |
| `unvotedTtl`     | Lifetime in days from the memory's `created` date. |
| `humanUpvoteTtl` | Lifetime in days from its last human upvote.       |
| `agentUpvoteTtl` | Lifetime in days from its last agent upvote.       |

> [!TIP]
> The memory becomes eligible for review when all applicable lifetimes have elapsed. Upvotes do not stack or shorten a longer lifetime.

### databaseUrlCommand

A command that supplies the database connection string.

To configure the `databaseUrlCommand`, update your `tiramisu.json` file:

```json file="tiramisu.json"
{
  // Example for doppler
  "databaseUrlCommand": "doppler secrets get TIRAMISU_DATABASE_URL --plain"
}
```
