import { sql } from "drizzle-orm";
import { check, index, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Git owns memory content; this shared table records events for stable memory IDs. */
export const upvotes = pgSchema("tiramisu").table(
  "upvotes",
  {
    id: uuid("id").primaryKey(),
    // Existing memory files accept string IDs; new memories already generate UUIDs.
    memoryId: text("memory_id").notNull(),
    actor: text("actor", { enum: ["human", "agent"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("upvotes_memory_id_idx").on(table.memoryId),
    check("upvotes_actor_check", sql`${table.actor} in ('human', 'agent')`),
    check("upvotes_memory_id_check", sql`${table.memoryId} ~ '[^[:space:]]'`),
  ],
);
