import { defineConfig } from "drizzle-kit"

/**
 * `drizzle-kit generate` reads the schema and emits SQL migrations into
 * `db/migrations` — no database connection required, which is what lets us
 * develop entirely against local PGlite with no hosted database.
 *
 * When Supabase comes online, set `DATABASE_URL` and use `drizzle-kit migrate`
 * / `studio` to apply the very same migrations to Postgres.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
})
