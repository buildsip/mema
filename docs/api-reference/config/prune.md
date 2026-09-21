# `prune`

Pruning settings, or `false` to disable.

```json
{
  "prune": false
}
```

```json
{
  "prune": {
    "ttl": "90d",
    "humanUpvoteAdds": "180d",
    "agentUpvoteAdds": "90d"
  }
}
```

| Field                                           | Type                                                |
| ----------------------------------------------- | --------------------------------------------------- |
| `ttl`                                           | Duration string, for example `"90d"`                |
| `humanUpvoteAdds`                               | Duration string                                     |
| `agentUpvoteAdds`                               | Duration string                                     |
| [`databaseUrlCommand`](./databaseUrlCommand.md) | Shell command string that prints the PostgreSQL URL |

All fields are optional. Unknown keys are rejected. `true` is not valid.

A package may omit `prune` to inherit its parent. `false` disables an inherited object, including its database command. Supplying `{ "ttl": "150d" }` overrides only `ttl` and keeps other inherited settings. A local `databaseUrlCommand` replaces the inherited command.

[`mema init`](../cli/init.md) writes `false`, or pruning settings with default durations (keeping existing durations). Every pruning-enabled setup requires a fresh command and saves it in that target's `prune.databaseUrlCommand`, replacing any previously saved command.

The CLI does not run pruning.

Enabling pruning during init configures the [database credential command](./databaseUrlCommand.md)
and applies pending database migrations before saving config. Existing data is preserved;
already applied migrations are skipped. Upvote and pruning operations are not yet exposed.

## Related

- [`mema init`](../cli/init.md)
- [`config.json`](../file-conventions/config-json.md)
