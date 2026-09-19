# Publishing mema

Only `packages/mema` is published to npm. The repository root and helper packages
stay private. The package's `prepack` script builds it and copies the repository's root
`README.md` and `LICENSE.md` into the package; `postpack` removes those generated copies.

## First release

From the repository root, run `pnpm i`, `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
Then inspect the package from its directory:

```bash
cd packages/mema
npm pack --dry-run
```

When ready, publish it yourself with `npm publish --access public` from that directory.

For subsequent GitHub Actions releases, configure an npm
[trusted publisher](https://docs.npmjs.com/trusted-publishers/) with owner `buildsip`,
repository `mema`, workflow filename `publish.yml`, and no environment.

## Later releases

From a clean repository root, run `pnpm release patch` (or `minor` / `major`). This bumps
`packages/mema/package.json`, commits, and pushes a matching `vX.Y.Z` tag.
Only pushing a version tag triggers the publish workflow. The workflow checks the version,
lints, typechecks, tests, builds, packs, publishes to npm, and creates a GitHub release.
