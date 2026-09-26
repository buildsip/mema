import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "bun:test";
import { findStores } from "./find-stores";
import { hasPackageManifest } from "./has-package-manifest";
import { placeMemory } from "./place-memory";

// Concrete filenames exercise both exact names and package-named extensions.
const manifests = [
  "package.json",
  "alire.toml",
  "Ballerina.toml",
  "vcpkg.json",
  "conanfile.py",
  "conanfile.txt",
  "billing.csproj",
  "deps.edn",
  "project.clj",
  "shard.yml",
  "dub.json",
  "dub.sdl",
  "pubspec.yaml",
  "mix.exs",
  "elm.json",
  "rebar.config",
  "billing.fsproj",
  "fpm.toml",
  "gleam.toml",
  "go.mod",
  "parser.cabal",
  "haxelib.json",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Project.toml",
  "JuliaProject.toml",
  "parser-1.0-1.rockspec",
  "Move.toml",
  "parser.nimble",
  "opam",
  "parser.opam",
  "composer.json",
  "spago.yaml",
  "spago.dhall",
  "pyproject.toml",
  "setup.py",
  "DESCRIPTION",
  "META6.json",
  "Gemfile",
  "parser.gemspec",
  "Cargo.toml",
  "Package.swift",
  "typst.toml",
  "v.mod",
  "billing.vbproj",
  "build.zig.zon",
];

let repo: string;

beforeEach(async () => {
  repo = await realpath(await mkdtemp(join(tmpdir(), "tiramisu-packages-")));
  execFileSync("git", ["init", "--quiet", repo]);
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

/** Creates a direct manifest and a nested source file without invoking language tools. */
async function makePackage({ path, manifest }: { path: string; manifest: string }) {
  await mkdir(join(path, "src"), { recursive: true });
  await writeFile(join(path, manifest), "");
  await writeFile(join(path, "src", "source"), "");
}

it.each([
  ...manifests,
  "MyProject.CSPROJ",
  "MyProject.FsPrOj",
  "MyProject.VBPROJ",
  "Package.CABAL",
  "parser-1.0-1.RoCkSpEc",
  "Parser.NIMBLE",
  "Parser.OpAm",
  "Parser.GEMSPEC",
])("places and discovers memories at a %s boundary", async (manifest) => {
  const project = join(repo, "packages", "example");
  await makePackage({ path: project, manifest });
  expect(await placeMemory({ repo, scope: ["packages/example"] })).toEqual({
    project,
    scope: undefined,
  });
  expect(await placeMemory({ repo, scope: ["packages/example/src/source"] })).toEqual({
    project,
    scope: ["packages/example/src/source"],
  });
  // A broad search must discover the same package that saving selected.
  expect(await findStores({ repo, project: repo, scopes: ["packages"] })).toEqual({
    stores: [repo, project].sort(),
  });
  // File scopes skip downward discovery and must still find their owning package.
  expect(
    await findStores({ repo, project: repo, scopes: ["packages/example/src/source"] }),
  ).toEqual({
    stores: [repo, project].sort(),
  });
});

it("uses the nearest common package across languages and deduplicates its manifests", async () => {
  const parent = join(repo, "packages", "parent");
  const child = join(parent, "child");
  await makePackage({ path: parent, manifest: "Cargo.toml" });
  await makePackage({ path: child, manifest: "parser.gemspec" });
  await writeFile(join(child, "package.json"), "{}");
  expect(
    await placeMemory({ repo, scope: ["packages/parent/src", "packages/parent/child"] }),
  ).toEqual({
    project: parent,
    scope: ["packages/parent/src", "packages/parent/child"],
  });
  expect(await placeMemory({ repo, scope: ["packages/parent/child/src"] })).toEqual({
    project: child,
    scope: ["packages/parent/child/src"],
  });
  expect(await findStores({ repo, project: repo })).toEqual({
    stores: [repo, parent, child].sort(),
  });
  expect(await placeMemory({ repo, scope: ["packages"] })).toEqual({
    project: repo,
    scope: ["packages"],
  });
});

it("does not treat generic build files, dependency lists, lockfiles, or lookalikes as manifests", async () => {
  const project = join(repo, "plain");
  await mkdir(project);
  for (const name of [
    "requirements.txt",
    "Gemfile.lock",
    "Pipfile",
    "setup.cfg",
    "Makefile",
    "CMakeLists.txt",
    "build.gradle.bak",
    "build.gradle.kts.bak",
    "conanfile.py.bak",
    "conanfile.txt.bak",
    "conan.lock",
    "gradle.lockfile",
    "build.zig",
    "go.work",
    "go.sum",
    "Cargo.lock",
    "package-lock.json",
    "pnpm-workspace.yaml",
    "stack.yaml",
    "cabal.project",
    "Directory.Build.props",
    "app.sln",
    "deno.json",
    "package.json.bak",
    "app.csproj.user",
    "APP.CSPROJ.USER",
    "app.gemspec.bak",
    ".cabal",
    ".CABAL",
    ".gemspec",
    ".opam",
  ])
    await writeFile(join(project, name), "");
  expect(await hasPackageManifest(project)).toBe(false);
  expect(await placeMemory({ repo, scope: ["plain"] })).toEqual({
    project: repo,
    scope: ["plain"],
  });
  expect(await findStores({ repo, project: repo })).toEqual({ stores: [repo] });
});

it("requires an existing file directly inside the package directory", async () => {
  const project = join(repo, "plain");
  await mkdir(join(project, "Cargo.toml"), { recursive: true });
  await mkdir(join(project, "app.csproj"));
  expect(await hasPackageManifest(project)).toBe(false);
  await symlink(join(repo, "missing"), join(project, "go.mod"));
  expect(await hasPackageManifest(project)).toBe(false);
  await writeFile(join(project, "source"), "");
  expect(await hasPackageManifest(join(project, "source"))).toBe(false);
  expect(await hasPackageManifest(join(repo, "missing"))).toBe(false);
  await makePackage({ path: join(project, "nested"), manifest: "go.mod" });
  expect(await hasPackageManifest(project)).toBe(false);
  await symlink(join(project, "nested", "go.mod"), join(project, "composer.json"));
  expect(await hasPackageManifest(project)).toBe(true);
});

it("respects Git ignores and excluded directories for every kind of manifest", async () => {
  const visible = join(repo, "packages", "[example]");
  await makePackage({ path: visible, manifest: "a name\nwith spaces.gemspec" });
  for (const path of [
    "ignored",
    "node_modules/dependency",
    ".memories/attachment",
    ".git/fixture",
  ]) {
    await makePackage({ path: join(repo, path), manifest: "Cargo.toml" });
  }
  await writeFile(join(repo, ".gitignore"), "ignored/\n");
  expect(await findStores({ repo, project: repo })).toEqual({ stores: [repo, visible].sort() });
  expect(await findStores({ repo, project: repo, scopes: ["packages/[example]"] })).toEqual({
    stores: [repo, visible].sort(),
  });
});

it("ignores deleted tracked manifests and notices newly created manifests on the next call", async () => {
  const project = join(repo, "package");
  await makePackage({ path: project, manifest: "Cargo.toml" });
  execFileSync("git", ["-C", repo, "add", "--", "package/Cargo.toml"]);
  await rm(join(project, "Cargo.toml"));
  expect(await findStores({ repo, project: repo })).toEqual({ stores: [repo] });
  await writeFile(join(project, "parser.cabal"), "");
  expect(await findStores({ repo, project: repo })).toEqual({ stores: [repo, project].sort() });
});

it("documents every supported manifest convention", async () => {
  const path = new URL("../../../docs/02-api-reference/file-conventions.md", import.meta.url);
  const docs = await readFile(path, "utf8");
  const table = docs
    .split("### Supported languages")[1]!
    .split("\n\n")
    .find((text) => text.startsWith("|"))!;
  const documented = [...table.matchAll(/`([^`]+)`/g)].map((match) => match[1]!);
  const expected = manifests.map((name) => {
    // Table patterns stand for a package name, while the tests use concrete files.
    const extension = name.slice(name.lastIndexOf("."));
    return [
      ".csproj",
      ".fsproj",
      ".vbproj",
      ".cabal",
      ".rockspec",
      ".nimble",
      ".opam",
      ".gemspec",
    ].includes(extension)
      ? `*${extension}`
      : name;
  });
  expect(documented.sort()).toEqual(expected.sort());
});
