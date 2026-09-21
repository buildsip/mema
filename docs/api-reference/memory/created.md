# `created`

UTC calendar date when the memory was inserted. `YYYY-MM-DD`.

```yaml
created: 2026-09-19
```

Omit `created` on insert and [`update`](../cli/update.md) input. Insert writes the current UTC date. Update keeps the stored value. Supplying it, including `null`, is rejected.

[`unvotedTtl`](../config/prune.md) is measured from this date. The value does not change when the file is edited, renamed, or moved.
