import type { log } from "@clack/prompts";
import { execFileSync } from "node:child_process";
import { accessSync } from "node:fs";
import { join } from "node:path";
import { NAMES } from "./names";

/** Installs the bundled skill through Vercel's CLI on every accepted setup, refreshing older copies. */
export function installWritingSkill(
  ctx: { log: Pick<typeof log, "step"> },
  { cwd, cliRoot, verbose = false }: { cwd: string; cliRoot: string; verbose?: boolean },
) {
  const source = join(cliRoot, NAMES.SKILLS, NAMES.MEMORY_WRITING_SKILL);
  try {
    // Fail before downloading the installer if the published package is missing its skill.
    accessSync(join(source, NAMES.SKILL_MD));
    ctx.log.step(`Installing ${NAMES.MEMORY_WRITING_SKILL} globally.`);
    // The init prompt already obtained consent; both CLIs can now run without extra prompts.
    execFileSync("npx", ["--yes", "skills", "add", source, "--global", "--yes"], {
      cwd,
      stdio: verbose ? "inherit" : "pipe",
      shell: process.platform === "win32",
    });
  } catch (error) {
    throw new Error(
      "Could not install the mema-memory-writing skill. Check that npx is available and can reach npm, then run mema init --verbose again. You can decline the skill installation to continue without it.",
      { cause: error },
    );
  }
}
