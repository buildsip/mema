import { assertNoSymlinks, readTextIfExists } from "@buildsip/file-utils";
import { join } from "node:path";
import { z } from "zod";
import { NAMES } from "./names";
import { parseValue } from "./parse-value";
import { databaseUrlCommandSchema } from "./database-url-command-schema";
import { parseDays } from "./parse-days";

const duration = z
  .string({
    error: 'Use a duration string of positive whole days, such as "90d"; the minimum is "1d".',
  })
  .refine((value) => {
    try {
      parseDays(value);
      return true;
    } catch {
      return false;
    }
  }, 'Use a duration string of positive whole days, such as "90d"; the minimum is "1d". Choose a smaller value if it exceeds the safe integer range in milliseconds.');

// Validate the config envelope with Zod. Custom JSON Schemas remain opaque here.
const schema = z.strictObject(
  {
    version: z
      .literal(1, {
        error: "Expected the number 1 (the supported config version), or omit this field.",
      })
      .optional(),
    /** Only the Git root config controls availableToWorkspace for the entire repo. */
    availableToWorkspace: z
      .boolean({
        error:
          "Expected a boolean: true to share this repo's memories, false to keep them local. Only set this in the Git root config.",
      })
      .optional(),
    frontmatter: z
      .strictObject(
        {
          /** One custom schema applies to every memory in the repo. */
          custom: z
            .record(z.string(), z.unknown(), {
              error:
                'Expected a JSON Schema object, for example {"properties":{"ticket":{"type":"string"}}}. Set frontmatter.custom only in the repository root config.',
            })
            .optional(),
        },
        {
          error: (issue) =>
            issue.code === "unrecognized_keys"
              ? "Remove this unknown field. Only custom (a JSON Schema object for extra memory fields) is allowed inside frontmatter."
              : 'Expected an object containing an optional custom JSON Schema, for example {"custom":{"properties":{"ticket":{"type":"string"}}}}.',
        },
      )
      .optional(),
    prune: z
      .union([
        z.literal(false, { error: "Expected false to disable pruning." }),
        z.strictObject(
          {
            databaseUrlCommand: databaseUrlCommandSchema.optional(),
            unvotedTtl: duration.optional(),
            humanUpvoteTtl: duration.optional(),
            agentUpvoteTtl: duration.optional(),
          },
          {
            error: (issue) =>
              issue.code === "unrecognized_keys"
                ? 'Remove this unknown field. Allowed pruning fields: databaseUrlCommand (a shell command string), unvotedTtl, humanUpvoteTtl, agentUpvoteTtl (positive whole-day strings, such as "90d").'
                : 'Expected a pruning settings object, such as {"unvotedTtl":"90d","humanUpvoteTtl":"180d","agentUpvoteTtl":"90d"}, or false to disable pruning.',
          },
        ),
      ])
      .optional(),
  },
  {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? "Remove this unknown field. Allowed config fields: version, availableToWorkspace, frontmatter, prune."
        : "Expected a config object with optional version, availableToWorkspace, frontmatter, and prune fields; use {} for defaults.",
  },
);

export type Config = z.infer<typeof schema>;

/**
 * Reads tiramisu.json directly from the Git root. All memory stores use this config.
 *
 * The original text lets init detect concurrent edits before saving.
 * Missing config uses defaults.
 */
export async function readConfig(repo: string) {
  const path = join(repo, NAMES.TIRAMISU_JSON);
  await assertNoSymlinks({ path, base: repo });
  const source = await readTextIfExists(path);
  let config: Config = {};
  if (source !== undefined) {
    let value: unknown;
    try {
      value = JSON.parse(source);
    } catch (cause) {
      throw new Error(
        `Invalid config ${path}: expected one valid JSON object with double-quoted keys and no comments or trailing commas. ${cause instanceof Error ? cause.message : String(cause)}`,
        { cause },
      );
    }
    config = parseValue({ schema, value, label: `config ${path}` });
  }
  return { config, availableToWorkspace: config.availableToWorkspace === true, source };
}
