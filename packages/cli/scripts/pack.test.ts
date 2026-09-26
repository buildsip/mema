import { expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

it("includes the init template and writing skill in the npm tarball", () => {
  const temp = mkdtempSync(join(tmpdir(), "tiramisu-pack-"));
  try {
    // The test script builds first. Keep npm's cache and tarball inside this test's directory.
    const output = execFileSync(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", temp, "--cache", join(temp, "cache")],
      {
        cwd: fileURLToPath(new URL("../", import.meta.url)),
        encoding: "utf8",
        shell: process.platform === "win32",
      },
    );
    const [pack] = JSON.parse(output) as { files: { path: string }[] }[];
    const files = pack!.files.map((file) => file.path);
    expect(files).toContain("templates/AGENTS.md");
    expect(files).toContain("skills/tiramisu-memory-writing/SKILL.md");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}, 30_000);
