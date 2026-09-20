import { runShell } from "./run-shell";

/** Runs the complete credential command in the Git root without changing process.env. */
export async function getDatabaseUrl({ repo, command }: { repo: string; command: string }) {
  let output: string;
  try {
    output = await runShell({ command, cwd: repo, timeout: 15_000, maxBuffer: 16_384 });
  } catch {
    // Never expose command text, captured output, or process errors containing credentials.
    throw new Error(`Invalid database url command.`);
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
      "The database command must print exactly one postgres:// or postgresql:// URL, with an optional trailing newline. Remove JSON, labels, logs, and raw whitespace from stdout; percent-encode special characters in the URL, then enter a corrected command during init or update the config and retry mema init.",
    );
  }
  return value;
}
