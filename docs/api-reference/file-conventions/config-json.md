# `config.json`

Store settings file at `.memories/config.json`.

```json
{
  "version": 1,
  "availableToWorkspace": false,
  "prune": false
}
```

Must be one JSON object with double-quoted keys. Comments and trailing commas are rejected.

## Inheritance

mema merges config from the Git root down to the owning repo or package directory. Closer files override parent values. Nested objects are merged field by field; `false` replaces a parent object.

[`availableToWorkspace`](../config/availableToWorkspace.md), [`frontmatter.custom`](../config/frontmatter.md), and [`prune`](../config/prune.md) may appear only in the Git root file. Packages inherit these settings and cannot override them.

A missing file is treated as `{}`.

## Related

- [Configuration](../config/index.md)
- [`mema init`](../cli/init.md)
