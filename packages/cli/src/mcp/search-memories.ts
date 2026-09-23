import { z } from "zod";
import { search } from "../commands/search";
import { describeSearch } from "../describe-search";
import { scopeSchema } from "../scope-schema";
import { inputError, repo, roots } from "./shared-input";
import { tool } from "./tool";
import { NAMES } from "../names";

/** Searches saved memories. `scope` limits results to those paths; omit it to search the whole repo. */
export const searchMemories = tool({
  name: "search-memories",
  description: `Search memories stored in \`${NAMES.MEMORIES}\` directories.`,
  schema: z.strictObject(
    {
      roots,
      repo,
      query: z
        .string({ error: "Provide a nonempty search query." })
        .regex(/\S/, "Provide a nonempty search query.")
        .describe(
          `Text to search in memory titles, frontmatter, ${NAMES.MEMORY_MD} parent directory names inside \`${NAMES.MEMORIES}\`, and Markdown bodies.`,
        ),
      // A filter for the paths being worked on, not the scope stored on a memory.
      scope: scopeSchema
        .optional()
        .describe(
          'Literal repository-relative file or directory paths; directories include descendants. Omit or use ["*"] or ["."] for the whole repo. No other wildcards. Prefer a narrow scope when working in a specific part of a repository.',
        ),
      limit: z
        .number({ error: "Provide limit as a positive integer, or omit it for 50 results." })
        .int("Provide limit as a safe integer.")
        .min(1, "Provide limit of at least 1.")
        .max(Number.MAX_SAFE_INTEGER, "Provide limit no greater than 9007199254740991.")
        .optional()
        .describe("Maximum number of ranked results. Defaults to 50."),
      offset: z
        .number({ error: "Provide offset as a nonnegative integer, or omit it to start at 0." })
        .int("Provide offset as a safe integer.")
        .min(0, "Provide offset of at least 0.")
        .max(Number.MAX_SAFE_INTEGER, "Provide offset no greater than 9007199254740991.")
        .optional()
        .describe("Defaults to 0."),
    },
    { error: inputError },
  ),
  run: search,
  instructions: ({ result }) => describeSearch(result),
  readOnly: true,
});
