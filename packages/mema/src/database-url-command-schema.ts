import { z } from "zod";

/** A complete shell command; only its output is treated as the database URL. */
export const databaseUrlCommandSchema = z
  .string({
    error: "Set prune.databaseUrlCommand to a shell command that prints one PostgreSQL URL.",
  })
  .refine((value) => Boolean(value.trim()) && !value.includes("\0"), {
    error:
      "Enter a nonempty shell command without NUL characters, such as doppler secrets get MEMORIES_DATABASE_URL --plain.",
  });
