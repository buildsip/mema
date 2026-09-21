# Upvotes and pruning

- Upvotes are relevant when pruning memories. Ask the agent to upvote useful memories on your behalf. An upvote from a human counts more than an automatic upvote from an agent.
- Upvotes aren't recorded when a memory is read, only when a memory is useful.

## How it works

1. The AI calls the `prune-memories` tool, which returns a list of paths to the files that meet the [pruning conditions](./config.md#prune) from `config.json`.
2. The AI then analyses the memories by searching the repo and suggests a list of candidates to delete.
3. It's highly recommended to ask the agent to upvote the pruning candidates you decide to keep, so that they don't show up on your next pruning session.

## Disable upvotes and pruning

`config.json`:

```json
{
  "prune": false
}
```

## Database credentials

Keep your PostgreSQL URL in your existing secrets manager. Ask your agent to configure Mema's
credential command under `prune.databaseUrlCommand`; the command supplies the URL without committing it to Git.
Packages inherit the command and may configure their own database.

Multiple repositories may share one database. The same memory ID shares its upvote history in
that database. Repeating database setup preserves votes and skips migrations already applied.
