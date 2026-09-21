import { copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";

// Copy the repo README and Apache LICENSE into this package for npm pack, then delete the copies.
for (const name of ["README.md", "LICENSE"]) {
  const target = join(process.cwd(), name);
  if (process.argv[2] === "copy") {
    copyFileSync(join(process.cwd(), "..", "..", name), target);
  } else if (process.argv[2] === "clean") {
    rmSync(target, { force: true });
  } else {
    throw new Error('Expected "copy" or "clean".');
  }
}
