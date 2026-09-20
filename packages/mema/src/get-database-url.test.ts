import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getDatabaseUrl } from "./get-database-url";

let repo: string;
beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "mema db command "));
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(repo, { recursive: true, force: true });
});

/** Put fixture code in a file so shell quoting concerns only the executable and script path. */
async function script({ name = "print url.cjs", code }: { name?: string; code: string }) {
  await writeFile(join(repo, name), code);
  return `"${process.execPath}" "${name}"`;
}

it("runs quoted commands in the given repo and leaves the environment unchanged", async () => {
  vi.stubEnv("MEMORIES_DATABASE_URL", "keep-the-global-value");
  const url = "postgresql://user:private%20password@localhost/memories";
  await writeFile(join(repo, "url.txt"), url);
  const command = await script({
    code: "process.stdout.write(require('node:fs').readFileSync('url.txt', 'utf8') + '\\r\\n')",
  });
  expect(await getDatabaseUrl({ repo, command })).toBe(url);
  expect(process.env.MEMORIES_DATABASE_URL).toBe("keep-the-global-value");
});

it.each([
  "",
  '{"value":"postgresql://localhost/db"}',
  "log\npostgresql://localhost/db",
  "postgresql://localhost/db\n\n",
  "https://localhost/db",
  "postgresql://",
  "postgresql://localhost/db name",
])("rejects invalid output without including its value: %j", async (output) => {
  const command = await script({ code: `process.stdout.write(${JSON.stringify(output)})` });
  await expect(getDatabaseUrl({ repo, command })).rejects.toThrow("must print exactly one");
});

it("does not forward secrets in failed command output or command text", async () => {
  const command = await script({
    code: "console.log('SECRET'); console.error('SECRET'); process.exit(1)",
  });
  const promise = getDatabaseUrl({ repo, command: `${command} SECRET` });
  await expect(promise).rejects.toThrow("Could not retrieve");
  await expect(promise).rejects.not.toThrow("SECRET");
});

it("supports two commands chained with && and diagnostics on stderr", async () => {
  const prepare = await script({
    name: "prepare.cjs",
    code: "require('node:fs').writeFileSync('ready.txt', 'postgres://localhost/db'); console.error('Preparing credentials')",
  });
  const read = await script({
    code: "console.log(require('node:fs').readFileSync('ready.txt', 'utf8'))",
  });
  expect(await getDatabaseUrl({ repo, command: `${prepare} && ${read}` })).toBe(
    "postgres://localhost/db",
  );
});

it("does not run the second command when the first command in && fails", async () => {
  const fail = await script({ name: "fail.cjs", code: "process.exit(1)" });
  const read = await script({
    code: "require('node:fs').writeFileSync('ran.txt', 'yes'); console.log('postgres://localhost/db')",
  });
  await expect(getDatabaseUrl({ repo, command: `${fail} && ${read}` })).rejects.toThrow(
    "Could not retrieve",
  );
  await expect(readFile(join(repo, "ran.txt"))).rejects.toMatchObject({ code: "ENOENT" });
});

it("supports a pipeline that extracts a URL from JSON", async () => {
  const json = await script({
    name: "json.cjs",
    code: "console.log(JSON.stringify({ value: 'postgres://localhost/db' }))",
  });
  const extract = await script({
    code: "console.log(JSON.parse(require('node:fs').readFileSync(0, 'utf8')).value)",
  });
  expect(await getDatabaseUrl({ repo, command: `${json} | ${extract}` })).toBe(
    "postgres://localhost/db",
  );
});

it.each(["stdout", "stderr"])("rejects excessive %s without exposing it", async (stream) => {
  const command = await script({ code: `process.${stream}.write('SECRET'.repeat(4000))` });
  const promise = getDatabaseUrl({ repo, command });
  await expect(promise).rejects.toThrow("Could not retrieve");
  await expect(promise).rejects.not.toThrow("SECRET");
});

it("stops a pipeline and its child processes within the timeout", async () => {
  const first = await script({
    name: "first.cjs",
    code: "require('node:fs').writeFileSync('first.pid', String(process.pid)); setInterval(() => {}, 1000)",
  });
  const second = await script({
    code: "require('node:fs').writeFileSync('second.pid', String(process.pid)); setInterval(() => {}, 1000)",
  });
  try {
    await expect(getDatabaseUrl({ repo, command: `${first} | ${second}` })).rejects.toThrow(
      "within 15 seconds",
    );
    for (const name of ["first.pid", "second.pid"]) {
      const pid = Number(await readFile(join(repo, name), "utf8"));
      await expect
        .poll(() => {
          try {
            process.kill(pid, 0);
            return true;
          } catch {
            return false;
          }
        })
        .toBe(false);
    }
  } finally {
    // Keep failing cleanup assertions from leaving the test's interval processes running.
    for (const name of ["first.pid", "second.pid"]) {
      try {
        process.kill(Number(await readFile(join(repo, name), "utf8")), "SIGKILL");
      } catch {
        /* Already exited. */
      }
    }
  }
}, 20_000);
