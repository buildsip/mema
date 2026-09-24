# Development

This repository uses Bun 1.4.2 (pinned in `.bun-version`) for dependencies, scripts, tests, and builds. Node.js 22.5+ is still required to run the published CLI and its integration tests. CI uses Node.js 24.

- `packages/cli`: the publishable `tiramisu` package.
- `packages/file-utils`: private filesystem helpers bundled into the CLI.
- `packages/typescript-config`: private shared TypeScript settings.

Run from the repository root:

```bash
bun install
bun run lint
bun run typecheck
bun run test
bun run build
```

Use `bun run test` to build the CLI before running tests. Tests run with `--isolate` so mocked modules and globals cannot leak between files. CLI and MCP integration tests launch the built JavaScript with Node, even though Bun runs the test suite.

`bun run build` uses Bun's bundler with the Node target. Runtime dependencies stay external, internal filesystem helpers are bundled, and SQL migrations are copied into `dist/migrations`. The published command retains its Node shebang. Users can keep their existing `npx`, `pnpm dlx`, Yarn, and Bun initialization commands.

## Dependencies

Commit `bun.lock` when dependencies change. CI uses `bun install --frozen-lockfile`.

The seven-day minimum release age is configured in `bunfig.toml`. `trustedDependencies` explicitly permits the PostgreSQL test binary setup scripts and esbuild's install script (still required transitively by drizzle-kit). Other dependency install scripts are not allowed. The previous pnpm `trustPolicy: no-downgrade` setting has no equivalent configured in this Bun setup; review dependency provenance changes when updating the lockfile.

## Packaging and releases

To inspect the npm package, run `npm pack --dry-run` in `packages/cli`. Its packaging hooks use Bun to build and prepare the README. Installing the published tarball does not require Bun.

Run `bun run release patch` (or `minor` or `major`) from a clean repository root. The release script updates the CLI version and Bun lockfile together, commits them, creates an annotated version tag, and pushes the commit and tag. CI runs the checks and publishes through npm with provenance.
