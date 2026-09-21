import { copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(process.cwd(), "..", "..");
const action = process.argv[2];

if (action !== "copy" && action !== "clean") {
  throw new Error('Expected "copy" or "clean".');
}

const names = ["README.md", "LICENSE"];

if (action === "clean") {
  for (const name of names) rmSync(join(process.cwd(), name), { force: true });
} else {
  copyFileSync(join(repoRoot, "LICENSE"), join(process.cwd(), "LICENSE"));
  const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
  const match = pkg.repository?.url?.match(/github\.com\/([^/]+\/[^/.]+)/);
  if (!match) throw new Error("package.json repository.url must be a GitHub URL.");
  // npmjs does not serve files from the tarball in the README. GitHub does for relative paths.
  // Rewrite only the packed copy so the repo README stays relative.
  const assets = `https://raw.githubusercontent.com/${match[1]}/main/docs/assets/`;
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8").replaceAll("docs/assets/", assets);
  writeFileSync(join(process.cwd(), "README.md"), readme);
}
