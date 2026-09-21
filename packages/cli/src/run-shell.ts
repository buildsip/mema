import { spawn } from "node:child_process";

/** Runs a shell expression with bounded output and stops its process group on failure. */
export function runShell({
  command,
  cwd,
  timeout,
  maxBuffer,
}: {
  command: string;
  cwd: string;
  timeout: number;
  maxBuffer: number;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const windows = process.platform === "win32";
    // A separate Unix process group lets us stop every stage of a pipeline together.
    const child = spawn(command, {
      cwd,
      shell: true,
      detached: !windows,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    let stdout = 0;
    let stderr = 0;
    let finished = false;
    const timer = setTimeout(() => fail(new Error("Command timed out.")), timeout);

    /** Close pipes and terminate the shell and its children before rejecting. */
    function fail(error: Error) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (child.pid) {
        if (windows) {
          const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
            windowsHide: true,
            stdio: "ignore",
          });
          killer.on("error", () => child.kill("SIGKILL"));
        } else {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            // The group may already have exited between the error and cleanup.
            child.kill("SIGKILL");
          }
        }
      }
      child.stdout.destroy();
      child.stderr.destroy();
      reject(error);
    }

    child.on("error", fail);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.length;
      if (stdout > maxBuffer) fail(new Error("Command output exceeded the limit."));
      else chunks.push(chunk);
    });
    // Drain stderr without retaining it; provider diagnostics can contain credentials.
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.length;
      if (stderr > maxBuffer) fail(new Error("Command output exceeded the limit."));
    });
    child.on("close", (code) => {
      if (finished) return;
      if (code !== 0) {
        fail(new Error("Command failed."));
        return;
      }
      finished = true;
      clearTimeout(timer);
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
}
