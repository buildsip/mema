import { defineConfig } from "drizzle-kit";

// Generate reviewed SQL at development time; users never run schema push.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/upvotes.ts",
  out: "./migrations",
});
