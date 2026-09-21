import { assertNoSymlinks, getAncestors, readTextIfExists } from "@buildsip/file-utils";
import { join } from "node:path";
import { z } from "zod";
import { mergeConfig } from "./merge-config";
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
 * Merges config from the Git root down to the owning repo or package directory.
 * Only the Git root defines pruning, sharing, and custom fields.
 *
 * @returns Effective config, the Git root's availableToWorkspace flag, and the local
 * config plus its original text. Init uses the local values to avoid copying inherited
 * settings into the file.
 */
export async function readConfig({ project, repo }: { project: string; repo: string }) {
  let config: Config = {};
  let local: Config = {};
  let source: string | undefined;
  let availableToWorkspace = false;
  // Apply root defaults first, then let each closer config override them.
  for (const parent of getAncestors({ path: project, root: repo }).reverse()) {
    const path = join(parent, NAMES.MEMORIES, NAMES.CONFIG_JSON);
    await assertNoSymlinks({ path, base: repo });
    const text = await readTextIfExists(path);
    if (text === undefined) continue;
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch (cause) {
      throw new Error(
        `Invalid config ${path}: expected one valid JSON object with double-quoted keys and no comments or trailing commas. ${cause instanceof Error ? cause.message : String(cause)}`,
        { cause },
      );
    }
    const parsed = parseValue({ schema, value, label: `config ${path}` });
    // Even false is root-only: packages cannot change their repository's pruning policy.
    if (parent !== repo && Object.hasOwn(parsed, "prune")) {
      throw new Error(
        `Remove prune from ${path}. Set it only in the repository root config: ${join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON)}. Packages inherit the root's pruning settings and cannot override or disable them.`,
      );
    }
    // Reject even false in child configs: availableToWorkspace has exactly one owner, the repo.
    if (parent !== repo && Object.hasOwn(parsed, "availableToWorkspace")) {
      throw new Error(
        `Remove availableToWorkspace from ${path}. Set it only in the repository root config: ${join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON)}. Use true to share all memories in this repo, or false (or omit it) to share none with other repos.`,
      );
    }
    // Reject even an empty schema so packages cannot replace or extend repo-wide rules.
    if (parent !== repo && parsed.frontmatter && Object.hasOwn(parsed.frontmatter, "custom")) {
      throw new Error(
        `Remove frontmatter.custom from ${path}. Define it only in the repository root config: ${join(repo, NAMES.MEMORIES, NAMES.CONFIG_JSON)}. One custom frontmatter schema applies to every memory in this repo; packages cannot override or extend it.`,
      );
    }
    if (parent === project) {
      local = parsed;
      source = text;
    }
    // Package settings cannot override the repo-wide availableToWorkspace flag.
    if (parent === repo) availableToWorkspace = parsed.availableToWorkspace === true;
    config = mergeConfig({ base: config, local: parsed }) as Config;
  }
  return { config, availableToWorkspace, local, source };
}
