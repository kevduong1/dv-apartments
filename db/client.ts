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
export const DATA_DIR = "idb://dv-apartments"

/**
 * Thrown when the local database can't be opened or migrated (e.g. an app
 * update shipped a migration the existing on-device data can't satisfy).
 * Carries the open PGlite handle when we have one, so the recovery UI can still
 * export a backup before the user resets.
 */
export class BootError extends Error {
  constructor(
    message: string,
    readonly pg: AppPGlite | null,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = "BootError"
  }
}

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
  // Held separately (and loosely typed) so a migration failure can still hand
  // the open handle to the recovery UI. `pg` below keeps its concrete inferred
  // type so it stays assignable to drizzle/runMigrations.
  let opened: AppPGlite | null = null
  try {
    const [{ PGlite }, { live }, { drizzle }, { runMigrations }, { seedIfEmpty }] =
      await Promise.all([
        import("@electric-sql/pglite"),
        import("@electric-sql/pglite/live"),
        import("drizzle-orm/pglite"),
        import("./migrate"),
        import("./seed"),
      ])

    const pg = await PGlite.create(DATA_DIR, { extensions: { live } })
    opened = pg
    await runMigrations(pg)

    const db = drizzle(pg, { schema })
    await seedIfEmpty(db)

    return { pg, db }
  } catch (error) {
    // Surface the open handle (if any) so the app can offer "back up + reset"
    // instead of getting stuck retrying a migration that can't apply.
    throw new BootError(
      error instanceof Error ? error.message : String(error),
      opened,
      { cause: error },
    )
  }
}
