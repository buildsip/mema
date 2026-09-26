---
title: Development
icon: Code
---

Run from the repository root:

```bash
bun install
bun run lint
bun run typecheck
bun run test
bun run build
```

## Packaging

To inspect the npm package, run `npm pack --dry-run` in `packages/cli`. Its packaging hooks use Bun to build and prepare the `README`.

## Release

```bash package="Patch"
bun run release patch
```

```bash package="Minor"
bun run release minor
```

```bash package="Major"
bun run release major
```

The release script updates the CLI version and Bun lockfile together, commits them, creates an annotated version tag, and pushes the commit and tag. The publish workflow runs the same checks, then publishes through npm with provenance.
