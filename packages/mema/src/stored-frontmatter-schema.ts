import { z } from "zod";
import { coerceCreated } from "./created-date";
import { frontmatterSchema } from "./frontmatter-schema";
import { scopeSchema } from "./scope-schema";

const createdDate = "Expected a UTC calendar date, YYYY-MM-DD.";

/** Saved memories require id and created; omitted scope inherits the owning store's scope. */
export const storedFrontmatterSchema = frontmatterSchema.extend({
  id: z
    .string({ error: "Expected a nonempty string identifying the memory." })
    .min(1, "Expected a nonempty string identifying the memory.")
    .regex(/\S/, "Expected a nonempty string identifying the memory."),
  // YAML may parse an unquoted YYYY-MM-DD as a Date; coerceCreated keeps the UTC day.
  created: z.preprocess(coerceCreated, z.iso.date({ error: createdDate })),
  scope: scopeSchema.optional(),
});
