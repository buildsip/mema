CREATE TABLE "mema"."upvotes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"memory_id" text NOT NULL,
	"actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upvotes_actor_check" CHECK ("mema"."upvotes"."actor" in ('human', 'agent')),
	CONSTRAINT "upvotes_memory_id_check" CHECK ("mema"."upvotes"."memory_id" ~ '[^[:space:]]')
);
--> statement-breakpoint
CREATE INDEX "upvotes_memory_id_idx" ON "mema"."upvotes" USING btree ("memory_id");
