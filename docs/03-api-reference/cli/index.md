---
title: CLI
icon: Terminal
---

`tiramisu` reads and writes Git-native memories. Agents run the same command.

Basic usage:

```bash title="Terminal"
tiramisu [command] [options]
```

Running `tiramisu` with no command prints help.

Every invocation also refreshes [global MCP installation](../mcp/installation.md).

Requires Node.js `>=22.5.0`.

## Reference

| Options             | Description            |
| ------------------- | ---------------------- |
| `-h` or `--help`    | Show help.             |
| `-V` or `--version` | Print the CLI version. |

### Commands

| Command                 | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| [`init`](./init.md)     | Configure tiramisu.json at the Git root.                |
| [`mcp`](./mcp.md)       | Serve memory tools over stdio.                          |
| [`search`](./search.md) | Search titles, frontmatter, directory tags, and bodies. |
| [`insert`](./insert.md) | Create one memory from JSON.                            |
| [`update`](./update.md) | Patch one existing memory from JSON.                    |
| [`delete`](./delete.md) | Delete memories and their attachments by path.          |
| [`upvote`](./upvote.md) | Record human or agent upvotes.                          |
| [`prune`](./prune.md)   | List expired memory directories for review.             |

### `--roots`

Required on search, insert, and update. Other commands do not take this flag. Pass every Git root in the workspace, including private and shared projects. Always supply the complete list, not only the projects targeted by this command. Repeat the flag or pass multiple paths.

```bash title="Terminal"
tiramisu search --roots /workspace/app --roots /workspace/team --repo /workspace/app --query cache
```

Each path must be a Git root directory. The CLI canonicalizes it with `realpath`. Duplicate roots and symlink aliases are ignored. For a project outside Git, initialize a Git repository for the user by running `git init` from that project directory, then retry. For a subdirectory of an existing repository, pass that repository's Git root instead.

### `--repo`

Required on search, insert, update, and prune. Git root of the workspace project the agent is working on. Delete and upvote determine each selected memory's repository from its absolute path and do not accept this flag.

`--repo` must be the Git root, not a package directory. For search, insert, and update, it must equal one of `--roots` after resolving path aliases. Prune takes only an absolute `--repo` and reviews that repository, including its package stores.

### `--input`

Optional on [`insert`](./insert.md) and [`update`](./update.md). Path to a JSON file. Omit it, or pass `-`, to read stdin.

Stdin must be piped. A TTY with no `--input` is an error.

JSON must be one object with double-quoted keys. Comments and trailing commas are rejected. A file path ignores stdin.

### Output

Successful `search`, `insert`, `update`, `delete`, `upvote`, and `prune` print JSON on stdout. MCP installation warnings, if any, are separate `{ "warning": "<instruction>" }` lines on stderr and do not fail the command.

Command failures print `{ "error": "<message>" }` on stderr, set exit code `1`, and print nothing on stdout. [`init`](./init.md) prints command errors through its interactive UI instead of JSON.

Help and version do not use this error format.

Memory `--path` and `--paths` values must be absolute directory paths returned by memory commands. Relative memory paths are rejected. Symbolic links inside a selected memory's repository are rejected.
