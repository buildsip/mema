import { readFileSync } from "node:fs";
import { expect, it } from "bun:test";
import { CLI_NAME } from "./cli-name";

it("publishes one bin, named tiramisu", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  expect(pkg.name).toBe(CLI_NAME);
  expect(pkg.bin).toEqual({ tiramisu: "./dist/index.js" });
});
