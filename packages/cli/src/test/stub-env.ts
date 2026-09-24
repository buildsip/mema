import { afterEach } from "bun:test";

const saved = new Map<string, string | undefined>();

// Restore missing variables by deleting them; assigning undefined stores a string instead.
afterEach(() => {
  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  saved.clear();
});

/** Changes a test environment variable and restores its original value after the test. */
export function stubEnv({ name, value }: { name: string; value?: string }) {
  if (!saved.has(name)) saved.set(name, process.env[name]);
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
