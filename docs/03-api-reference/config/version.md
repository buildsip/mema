---
title: "version"
icon: Tag
---

Supported config version. Optional. If present, must be the number `1`.

```json
{
  "version": 1
}
```

[`tiramisu init`](../cli/init.md) always writes `1`. Other values fail config validation.

This is the configuration-file format version, not the PostgreSQL schema version.
Database upgrades use [migration history stored in PostgreSQL](../database.md), independently
of this value and of whether the database contains votes.

## Related

- [`tiramisu.json`](../file-conventions/tiramisu-json.md)
