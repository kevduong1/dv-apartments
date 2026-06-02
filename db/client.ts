import type { PGliteWithLive } from "@electric-sql/pglite/live"
import type { PgliteDatabase } from "drizzle-orm/pglite"

import * as schema from "./schema"

/** PGlite instance with the live-query extension enabled. */
export type AppPGlite = PGliteWithLive
/** Drizzle handle bound to our schema. */
export type AppDb = PgliteDatabase<typeof schema>

/**
 * Where Postgres lives in the browser. The `idb://` prefix persists the whole
 * database into IndexedDB — so "PGlite or IndexedDB" is really "PGlite stored
 * in IndexedDB". (Swap to `opfs-ahp://` later for faster storage.)
 */
const DATA_DIR = "idb://dv-apartments"

let clientPromise: Promise<{ pg: AppPGlite; db: AppDb }> | null = null

/**
 * Boots the local database exactly once per page: create PGlite, run
 * migrations, wrap it with Drizzle, and seed demo data on first run.
 * Everything is dynamically imported so none of it touches the server bundle.
 */
export function getClient(): Promise<{ pg: AppPGlite; db: AppDb }> {
  clientPromise ??= boot()
  return clientPromise
}

async function boot(): Promise<{ pg: AppPGlite; db: AppDb }> {
  const [{ PGlite }, { live }, { drizzle }, { runMigrations }, { seedIfEmpty }] =
    await Promise.all([
      import("@electric-sql/pglite"),
      import("@electric-sql/pglite/live"),
      import("drizzle-orm/pglite"),
      import("./migrate"),
      import("./seed"),
    ])

  const pg = await PGlite.create(DATA_DIR, { extensions: { live } })
  await runMigrations(pg)

  const db = drizzle(pg, { schema })
  await seedIfEmpty(db)

  return { pg, db }
}
