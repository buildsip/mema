---
title: ".memories"
icon: Folder
---

The memory store directory. Allowed only at a package root or the Git root.

[`tiramisu insert`](../cli/insert.md) creates it when placing the first memory in that store. [`tiramisu init`](../cli/init.md) writes repository configuration without creating memory stores.

It must be a directory. A file at that path is rejected.

Each memory lives in its own title-named directory directly inside `.memories`, or beneath optional category folders. See [`title`](../memory/title.md).

```txt
.memories/errors/axios-reconnect-retry/memory.md
```

`memory.md` cannot be a direct child of `.memories/`.

Directories whose names start with `.mem-` are temporary write stages and are ignored when loading memories.

## Tags

Directories between `.memories/` and the title folder are search tags. [`update`](../cli/update.md) keeps them when renaming the title folder or moving stores.

```txt
.memories/errors/network/cache-rule/memory.md
```

Searching for `errors` can hit that memory. See [`search`](../cli/search.md).

## Attachments

Any sibling of `memory.md` moves with the folder on update, including nested directories.

## Related

- [`tiramisu.json`](./tiramisu-json.md)
- [`memory.md`](./memory-md.md)
- [`delete`](../cli/delete.md)
