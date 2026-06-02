import type { PGlite } from "@electric-sql/pglite"

import { migrations } from "./migrations.generated"

/**
 * Applies any not-yet-applied bundled migrations to the local PGlite database,
 * each in its own transaction, tracking what's been run in `__migrations`.
 *
 * The `--> statement-breakpoint` markers drizzle emits are plain SQL comments,
 * so each migration file can be handed to `exec()` as a single string.
 */
export async function runMigrations(pg: PGlite): Promise<void> {
  await pg.exec(
    `CREATE TABLE IF NOT EXISTS __migrations (
       tag        text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     );`,
  )

  const { rows } = await pg.query<{ tag: string }>("SELECT tag FROM __migrations")
  const applied = new Set(rows.map((r) => r.tag))

  for (const migration of migrations) {
    if (applied.has(migration.tag)) continue
    await pg.transaction(async (tx) => {
      await tx.exec(migration.sql)
      await tx.query("INSERT INTO __migrations (tag) VALUES ($1)", [migration.tag])
    })
  }
}
