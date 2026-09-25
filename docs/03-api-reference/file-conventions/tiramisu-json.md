---
title: "tiramisu.json"
icon: FileBraces
---

Repository-wide settings file, placed directly at the Git root alongside `.git`.

```json title="tiramisu.json"
{
  "version": 1,
  "availableToWorkspace": false,
  "prune": false
}
```

Must be one JSON object with double-quoted keys. Comments and trailing commas are rejected.

## Location

One file configures every memory store in the repository. Package config files are ignored; settings are not merged or overridden by directory.

A missing file is treated as `{}`. [`tiramisu init`](../cli/init.md) creates or reconfigures this file from anywhere in the Git working tree.

## Related

- [Configuration](../config/index.md)
- [`tiramisu init`](../cli/init.md)
