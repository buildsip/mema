import type { log } from "@clack/prompts";
import { agents, detectGlobalAgents, type AgentType } from "add-mcp";
import { execFileSync } from "node:child_process";
import { accessSync } from "node:fs";
import { join } from "node:path";
import { CLI_NAME } from "./cli-name";
import { NAMES } from "./names";

// add-mcp and Vercel Skills use different IDs for some agents. Null means no Skills target.
// Keep this exhaustive so an add-mcp upgrade cannot silently add an unmapped agent.
const targets: Record<AgentType, string | null> = {
  antigravity: "antigravity",
  cline: "cline",
  "cline-cli": "cline",
  "claude-code": "claude-code",
  "claude-desktop": null,
  codex: "codex",
  cursor: "cursor",
  fx: "fx",
  "gemini-cli": "gemini-cli",
  goose: "goose",
  "github-copilot-cli": "github-copilot",
  "grok-build": "grok",
  "kilo-code": "kilo",
  "kimi-code": "kimi-code-cli",
  "kiro-cli": "kiro-cli",
  mastracode: null,
  mcporter: null,
  opencode: "opencode",
  pi: "pi",
  vscode: "github-copilot",
  windsurf: "windsurf",
  zed: "zed",
};

/** Installs or refreshes the bundled skill for detected agents after the user accepts. */
export async function installWritingSkill(
  ctx: { log: Pick<typeof log, "step" | "warn"> },
  { cwd, cliRoot, verbose = false }: { cwd: string; cliRoot: string; verbose?: boolean },
) {
  const source = join(cliRoot, NAMES.SKILLS, NAMES.MEMORY_WRITING_SKILL);
  try {
    // Fail before downloading the installer if the published package is missing its skill.
    accessSync(join(source, NAMES.SKILL_MD));
    const detected = await detectGlobalAgents();
    const selected = [...new Set(detected.flatMap((agent) => targets[agent] ?? []))];
    const unsupported = detected.filter((agent) => !targets[agent]);
    if (unsupported.length) {
      ctx.log.warn(
        `Vercel Skills has no target for ${unsupported.map((agent) => agents[agent].displayName).join(", ")}. Use a supported agent such as Claude Code, Codex, or Cursor, then run ${CLI_NAME} init again and accept skill installation.`,
      );
    }
    // Never omit --agent: the installer could otherwise target only the calling agent or all agents.
    if (!selected.length) {
      ctx.log.warn(
        `No supported installed agents were detected; the writing skill was not installed. Open a supported agent such as Claude Code, Codex, or Cursor, then run ${CLI_NAME} init again and accept skill installation.`,
      );
      return;
    }
    ctx.log.step(`Installing ${NAMES.MEMORY_WRITING_SKILL} globally.`);
    // init already obtained consent; both installers can run without further prompts.
    execFileSync(
      "npx",
      ["--yes", "skills", "add", source, "--global", "--yes", "--agent", ...selected],
      {
        cwd,
        stdio: verbose ? "inherit" : "pipe",
        shell: process.platform === "win32",
      },
    );
  } catch (error) {
    throw new Error(
      `Could not install the tiramisu-memory-writing skill. Check access to your agent configuration directories and that npx can reach npm, then run ${CLI_NAME} init --verbose again. You can decline skill installation to continue setup without it.`,
      { cause: error },
    );
  }
}
