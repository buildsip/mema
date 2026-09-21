# `config.json`

Location: `.memories/config.json`

Packages inherit configuration from the repository root.

## availableToWorkspace

Optional. Defaults to false. If true, all memories in that repository are available to all other projects in the active workspace.

> [!WARNING]
> `availableToWorkspace` can only be enabled in the `config.json` at the root of a repository.

## frontmatter

### custom

To use custom frontmatter fields for memories, define a JSON Schema.

> [!WARNING]
> `frontmatter.custom` can only be enabled in the `config.json` at the root of a repository. The schema applies to every memory in the repo.

Root `.memories/config.json`:

```json
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

### Changing the schema

Existing memories remain searchable when you add, change, or remove custom field rules. Their files are not rewritten. Newly created or edited memories must satisfy the current schema.

## prune

Setup enables pruning by default. Omitting this field or setting it to `false` disables pruning:

```json
{
  "prune": false
}
```

Providing an object enables pruning:

```json
{
  "prune": {
    "unvotedTtl": "90d",
    "humanUpvoteTtl": "180d",
    "agentUpvoteTtl": "90d"
  }
}
```

> [!WARNING]
> This field can only be configured at the root of the repo.

### Lifetimes

- `unvotedTtl`: lifetime from the memory's `created` date. Default `"90d"`.
- `humanUpvoteTtl`: lifetime from its last human upvote. Default `"180d"`.
- `agentUpvoteTtl`: lifetime from its last agent upvote. Default `"90d"`.

Use positive whole days such as `"90d"`, with a minimum of `"1d"`. The memory becomes eligible for review when all applicable lifetimes have elapsed. Upvotes do not stack or shorten a longer lifetime.

### databaseUrlCommand

A command that supplies the database connection string.
