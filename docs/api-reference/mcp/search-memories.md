# search-memories

Searches memories using [`tiramisu search`](../cli/search.md)'s ranking and store discovery rules.

```json
{
  "roots": ["/workspace/app", "/workspace/team-memories"],
  "repo": "/workspace/app",
  "query": "cache",
  "scope": ["apps/web"],
  "limit": 10
}
```

## Parameters

| Parameter                                       | Type       | Required | Description                                                                                                                                                |
| ----------------------------------------------- | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`roots`, `repo`](./index.md#shared-parameters) | —          | Yes      | Workspace and active repository.                                                                                                                           |
| `query`                                         | `string`   | Yes      | Nonempty text to search.                                                                                                                                   |
| `scope`                                         | `string[]` | No       | Existing repository-relative files or directories. Directories include descendants. Omit, `["*"]`, or `["."]` searches the whole repo. No other wildcards. |
| `limit`                                         | `number`   | No       | Positive safe integer. Defaults to `50`.                                                                                                                   |
| `offset`                                        | `number`   | No       | Nonnegative safe integer. Defaults to `0`.                                                                                                                 |

## Returns

A ranked JSON array of `{ path, score, frontmatter, body }`. Paths are absolute memory directories. Shared repositories contribute memories according to [`availableToWorkspace`](../config/availableToWorkspace.md).

If a returned memory contradicts the code, tell the user and offer to update or delete it. Do not call prune for contradictions. Upvote with `actor: "agent"` only when a memory helps produce the reply and its repository has pruning enabled.
