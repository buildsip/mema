---
title: "MCP"
icon: Plug
---

The `tiramisu` MCP server exposes memory commands over stdio. See [installation](./installation.md) to connect an agent.

## Tools

| Tool                                      | Description                                 |
| ----------------------------------------- | ------------------------------------------- |
| [`insert-memory`](./insert-memory.md)     | Create one memory.                          |
| [`update-memory`](./update-memory.md)     | Patch an existing memory.                   |
| [`search-memories`](./search-memories.md) | Search saved memories.                      |
| [`delete-memories`](./delete-memories.md) | Delete memories and attachments.            |
| [`upvote-memories`](./upvote-memories.md) | Record a batch of human or agent upvotes.   |
| [`prune-memories`](./prune-memories.md)   | List expired memory directories for review. |

## Shared parameters

Search, insert, and update require `roots`: the complete list of Git roots in the workspace, including projects that are not targeted by the call. Keep this list complete across calls. These tools also require `repo` to select the active project.

Prune takes only `repo` and reviews that repository. Delete takes only `paths`; upvote takes `paths` and `actor`. Both determine each memory's repository from its absolute path and do not accept `roots` or `repo`.

| Parameter | Type       | Description                                                                                                                                            |
| --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `roots`   | `string[]` | Absolute paths of every workspace Git root, including private and shared repositories. Pass the complete list; at least one Git root is required. |
| `repo`    | `string`   | Absolute Git root of the selected project. For search, insert, and update, it must equal one of `roots` after resolving path aliases. Package directories are rejected. |

Every root is validated, including projects not targeted by the call. For a project outside Git, initialize a Git repository for the user by running `git init` from that project directory, then retry. For a subdirectory of an existing repository, pass that repository's Git root instead. Duplicate roots and symlink aliases are deduplicated.

```json
{
  "roots": ["/workspace/app", "/workspace/team-memories"],
  "repo": "/workspace/app"
}
```

Arguments are structured objects. Do not encode them as a JSON string or pass CLI flags. Field descriptions and required fields are included in each tool's JSON Schema. Custom frontmatter is validated against the destination store's [configuration](../config/frontmatter.md).

Memory `path` and `paths` values must be absolute directories. Reuse paths returned by memory tools. Relative memory paths are rejected. Scope entries remain repository-relative.

The server does not infer workspace folders from its working directory or request MCP roots from the client.

## Results

Success returns the same JSON as the corresponding CLI command in the first text content block. [`insert-memory`](./insert-memory.md) and [`update-memory`](./update-memory.md) add a second text block with [categorization guidance](#categorization-guidance). [`prune-memories`](./prune-memories.md) adds candidate review instructions when its result is nonempty. Failures return `isError: true` with an instruction string in one text block, without an additional `{ "error": ... }` wrapper.

```json
{
  "content": [
    {
      "type": "text",
      "text": "[\"/workspace/app/.memories/cache\"]"
    }
  ]
}
```

The server stays available after tool errors. Its initialize response reports the running package version.

After insert or update returns, the agent may add attachments beside `memory.md` in the returned directory when useful. Attachments are supporting files, such as images or long documents, and are not searchable. The success response includes this guidance.

### Categorization guidance

After an insert or update, the second text block identifies the saved memory directory and its owning `.memories` directory. The agent may move the whole memory directory within that exact `.memories` directory and create parent category folders. It must keep the memory folder's name and contents together, avoid other memory directories and symbolic links, and use the new path for later calls.

Category names should help users browse their memories. These parent directories also act as [search tags](../file-conventions/memories.md#tags).

The block ends with a sorted directory listing prefixed with the owning `.memories` folder:

```text
.memories/
.memories/network/
.memories/network/http/
.memories/rendering/
.memories/rendering/hydration/
.memories/state/
.memories/state/zustand/
.memories/state/zustand/selectors/
```

The listing includes empty category folders and excludes memory folders and their contents, files, symbolic links, and temporary `.mem-` folders. A store without categories shows only `.memories/`. If the listing cannot be read, the block tells the agent to inspect the `.memories` directory; the save remains successful.
