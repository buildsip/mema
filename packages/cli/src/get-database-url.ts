import { runShell } from "./run-shell";

/** Runs the complete credential command in the Git root without changing process.env. */
export async function getDatabaseUrl({ repo, command }: { repo: string; command: string }) {
  let output: string;
  try {
    output = await runShell({ command, cwd: repo, timeout: 15_000, maxBuffer: 16_384 });
  } catch {
    // Never expose command text, captured output, or process errors containing credentials.
    throw new Error(
      `The command you entered failed. It should print one PostgreSQL URL. Please try again.`,
    );
  }
  // Accept the usual single trailing newline, not surrounding logs or multiple values.
  const value = output.replace(/\r?\n$/, "");
  const url = URL.canParse(value) ? new URL(value) : undefined;
  if (
    !url ||
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    /[\s\0]/.test(value)
  ) {
    throw new Error(
      "The command you entered must print one postgres:// or postgresql:// URL, with an optional trailing newline. Please try again.",
    );
  }
  return value;
}
