import { isAbsolute } from "node:path";
import { z } from "zod";

/**
 * An absolute directory path.
 * `isAbsolute` accepts `/Users/me/repo` and rejects `../repo` or `repo`.
 * NUL is rejected because it cannot appear in a real path.
 */
const absolutePath = z
  .string({ error: "Provide an absolute directory path." })
  .refine(
    (path) => isAbsolute(path) && !path.includes("\0"),
    "Provide an absolute directory path without NUL characters.",
  );

/** Tools that take roots require the complete list of workspace projects. */
export const roots = z
  .array(absolutePath, {
    error: "Provide roots as an array of absolute workspace directory paths.",
  })
  .min(1, "Include every workspace folder in roots; at least one is required.")
  .describe(
    "Absolute paths of every project root in the workspace. Always pass the complete list, not only the projects targeted by this call.",
  );

/** Tools that operate on one project take its Git root. */
export const repo = absolutePath.describe(
  "Absolute path of the Git root of the project to operate on. When this tool also takes roots, select the project from that workspace.",
);

/**
 * Absolute path to a memory directory, the folder that contains memory.md.
 */
export const memoryPath = z
  .string({ error: "Provide an absolute path to an existing memory directory." })
  .refine(
    (path) => isAbsolute(path) && !path.includes("\0"),
    "Provide an absolute memory directory path without NUL characters.",
  );

/** Explains a bad tool payload: extra keys, or a value that is not the expected object. */
export const inputError = (issue: { code: string }) =>
  issue.code === "unrecognized_keys"
    ? "Remove unknown top-level fields. Use only the fields listed in this tool's input schema; put configured custom fields inside frontmatter."
    : "Provide one object matching this tool's input schema, including every required field.";
