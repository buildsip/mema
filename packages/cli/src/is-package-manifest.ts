import { extname } from "node:path";
import { NAMES } from "./names";

// Conventional package/project entry points, including ecosystem-specific build
// and dependency files. Keep this list in sync with the supported-languages table.
const names = new Set<string>([
  "package.json",
  "alire.toml", // Ada (Alire)
  "Ballerina.toml",
  "vcpkg.json", // C / C++ (vcpkg)
  "conanfile.py", // C / C++ (Conan)
  "conanfile.txt",
  "deps.edn", // Clojure CLI
  "project.clj", // Clojure (Leiningen)
  "shard.yml", // Crystal
  "dub.json", // D
  "dub.sdl",
  "pubspec.yaml", // Dart / Flutter
  "mix.exs", // Elixir
  "elm.json",
  "rebar.config", // Erlang
  "fpm.toml", // Fortran
  "gleam.toml",
  "go.mod",
  "haxelib.json",
  "pom.xml", // JVM languages using Maven
  "build.gradle", // Gradle projects, including Android modules
  "build.gradle.kts",
  "Project.toml", // Julia
  "JuliaProject.toml",
  "Move.toml",
  "opam", // OCaml also accepts a bare opam filename
  "composer.json", // PHP
  "spago.yaml", // PureScript
  "spago.dhall",
  "pyproject.toml", // Python
  "setup.py",
  "DESCRIPTION", // R
  "META6.json", // Raku
  "Gemfile", // Ruby applications using Bundler
  "Cargo.toml", // Rust
  "Package.swift",
  "typst.toml",
  "v.mod",
  "build.zig.zon",
]);

// These ecosystems put the package name before a standard extension.
const extensions = new Set([
  ".csproj",
  ".fsproj",
  ".vbproj",
  ".cabal",
  ".rockspec",
  ".nimble",
  ".opam",
  ".gemspec",
]);

/** Matches a direct filename; it does not read or execute the manifest. */
export function isPackageManifest(name: string) {
  // extname rejects bare extensions such as `.cabal` and backup files such as
  // `example.cabal.bak`, while accepting names containing spaces or newlines.
  // Normalize package-named extensions on every platform so checkout location
  // does not change detection of files such as MyProject.CSPROJ or Parser.CABAL.
  return names.has(name) || extensions.has(extname(name).toLowerCase());
}
