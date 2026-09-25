---
title: "Upvotes and pruning"
icon: ThumbsUp
---

- Upvotes are relevant when pruning memories. Ask the agent to upvote useful memories on your behalf. An upvote from a human counts more than an automatic upvote from an agent.
- Reading alone does not record an upvote. A memory that helps the agent produce a reply receives an `agent` upvote when pruning is enabled. Every successful memory update also records an agent upvote.
- Upvotes do not stack. The latest human and agent upvotes each start their own lifetime; the longest applicable lifetime determines eligibility.

## How it works

1. When you ask to prune, the agent calls `prune-memories`. It returns memory directories that meet the [pruning conditions](./config.md#prune) in the repository you choose, including its packages. Memories marked `doNotDelete` are excluded. The tool never deletes anything.
2. The AI then analyses the memories by searching the repo and suggests a list of candidates to delete.
3. It's highly recommended to ask the agent to upvote the pruning candidates you decide to keep, so that they don't show up on your next pruning session.

## Disable upvotes and pruning

`tiramisu.json`:

```json
{
  "prune": false
}
```

## Database credentials

Keep your PostgreSQL URL in your existing secrets manager. Ask your agent to configure Tiramisu's
credential command under `prune.databaseUrlCommand`; the command supplies the URL without committing it to Git.

Multiple repositories may share one database. The same memory ID shares its upvote history in
that database. Repeating database setup preserves votes and skips migrations already applied.
