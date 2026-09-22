# `.memories`

The memory store directory. Allowed only at a package root or the Git root.

[`tiramisu insert`](../cli/insert.md) creates it when placing the first memory in that store. [`tiramisu init`](../cli/init.md) writes repository configuration without creating memory stores.

It must be a directory. A file at that path is rejected.

## Related

- [`tiramisu.json`](./tiramisu-json.md)
- [`data/`](./data.md)
