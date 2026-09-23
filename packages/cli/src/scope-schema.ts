import { z } from "zod";
import { normalizeScopes } from "./normalize-scopes";

// Validate each path before deduplication so errors retain their original array index.
const path = z
  .string({
    error:
      'Expected a repository-relative file or directory path, such as "apps/web/auth", or "*" for the whole repo.',
  })
  .superRefine((scope, ctx) => {
    try {
      normalizeScopes([scope]);
    } catch (error) {
      ctx.addIssue({ code: "custom", message: (error as Error).message });
    }
  });

const message =
  'Expected a nonempty array of repository-relative file or directory paths, such as ["apps/web/auth"]. Use ["*"] for the whole repository.';

/**
 * Where a memory applies. Insert and update show this text.
 * Search filters by the paths being worked on, so it uses its own description.
 */
export const memoryScopeDescription =
  'The narrowest repository-relative files or directories where this memory provides useful context. For example, a login-session cookie rule used throughout authentication applies to ["apps/web/auth"]. Directories include descendants; ["*"] means the whole repository.';

/** Scope always uses an array; callers decide whether it is required or optional. */
export const scopeSchema = z.array(path, { error: message }).min(1, message);
