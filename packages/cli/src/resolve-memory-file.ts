import { assertNoSymlinks, lstatIfExists } from "@buildsip/file-utils";
import { realpath } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { NAMES } from "./names";

/** Resolves a public memory directory to its file for internal reads and lookup. */
export async function resolveMemoryFile({ path: target, repo }: { path: string; repo: string }) {
  if (typeof target !== "string" || !isAbsolute(target) || target.includes("\0")) {
    throw new Error(
      "Provide an absolute memory directory path without NUL characters. Reuse a path returned by a memory tool.",
    );
  }
  // Normalize an already absolute path; neither repo nor the working directory is a base.
  const path = resolve(target);
  await assertNoSymlinks({ path, base: repo });
  const info = await lstatIfExists({ path });
  if (info && !info.isDirectory()) {
    throw new Error(
      `Provide an existing memory directory containing ${NAMES.MEMORY_MD}, not a file: ${target}`,
    );
  }
  const file = join(path, NAMES.MEMORY_MD);
  // Check the file separately so a valid directory cannot hide a symlinked memory.md.
  await assertNoSymlinks({ path: file, base: repo });
  if (!(await lstatIfExists({ path: file }))?.isFile()) {
    throw new Error(
      `No memory exists at ${path}. Search again and use its current directory path.`,
    );
  }
  return realpath(file);
}
