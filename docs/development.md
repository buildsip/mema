# Development

This repository is a pnpm monorepo:

- `packages/cli`: the publishable `tiramisu` package. The command is `tiramisu`.
- `packages/file-utils`: private filesystem helpers bundled into the CLI.
- `packages/typescript-config`: private shared TypeScript settings.

Run from the repository root:

```bash
pnpm i
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

To inspect the npm package, run `npm pack --dry-run` in `packages/cli`.
