# Configuration

Fields in [`tiramisu.json`](../file-conventions/tiramisu-json.md).

Unknown keys are rejected. Allowed fields: `version`, `availableToWorkspace`, `frontmatter`, `prune`.

```json
{
  "version": 1,
  "availableToWorkspace": false,
  "frontmatter": {
    "custom": {
      "properties": {
        "ticket": { "type": "string" }
      }
    }
  },
  "prune": {
    "unvotedTtl": "90d",
    "humanUpvoteTtl": "180d",
    "agentUpvoteTtl": "90d"
  }
}
```

- [`version`](./version.md)
- [`availableToWorkspace`](./availableToWorkspace.md)
- [`frontmatter`](./frontmatter.md)
- [`prune`](./prune.md)
- [`prune.databaseUrlCommand`](./databaseUrlCommand.md)
