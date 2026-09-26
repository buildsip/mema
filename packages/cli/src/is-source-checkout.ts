import { existsSync } from "node:fs";
import { join } from "node:path";

/** Recognizes the CLI's source checkout; npm packages omit both development files. */
export function isSourceCheckout({ root }: { root: string }) {
  return existsSync(join(root, "src", "index.ts")) && existsSync(join(root, "scripts", "build.mjs"));
}
