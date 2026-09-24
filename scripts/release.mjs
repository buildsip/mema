import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const bump = process.argv[2];

if (!["patch", "minor", "major"].includes(bump)) {
  throw new Error("Run bun run release with patch, minor, or major.");
}

/** Stop at the first failed step so a failed version update cannot publish a tag. */
function run({ command, args, cwd, capture = false }) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (capture) process.stderr.write(result.stderr ?? "");
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

// Both the package version and workspace lockfile belong in the release commit.
if (run({ command: "git", args: ["status", "--porcelain"], capture: true }).trim()) {
  throw new Error("Commit or stash your changes before running bun run release.");
}
run({ command: "bun", args: ["pm", "version", bump, "--no-git-tag-version"], cwd: "packages/cli" });
run({ command: "bun", args: ["install", "--lockfile-only"] });
const { version } = JSON.parse(readFileSync("packages/cli/package.json", "utf8"));
const message = `chore: release tiramisu@${version}`;
run({ command: "git", args: ["add", "packages/cli/package.json", "bun.lock"] });
run({ command: "git", args: ["commit", "-m", message] });
run({ command: "git", args: ["tag", "-a", `v${version}`, "-m", message] });
run({ command: "git", args: ["push"] });
run({ command: "git", args: ["push", "--follow-tags"] });
