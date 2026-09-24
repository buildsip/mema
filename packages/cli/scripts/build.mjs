import { chmod, cp, readFile, rm } from "node:fs/promises";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

await rm("dist", { recursive: true, force: true });

// Bun builds development sources into JavaScript that still runs on Node.
const result = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  naming: "index.js",
  // Bundle internal filesystem helpers; only runtime dependencies remain external.
  external: Object.keys(pkg.dependencies),
  format: "esm",
  target: "node",
  sourcemap: "linked",
});

if (!result.success)
  throw new AggregateError(
    result.logs,
    "CLI build failed. Fix the reported source errors and run bun run build again.",
  );

await chmod("dist/index.js", 0o755);

// SQL and Drizzle's journal must ship with the CLI; resolve them from the installed package.
await cp(
  new URL("../migrations", import.meta.url),
  new URL("../dist/migrations", import.meta.url),
  {
    recursive: true,
  },
);
