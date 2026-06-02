import { DATA_DIR, type AppPGlite } from "./client"

/*
 * On-device data management: export, restore, and reset.
 *
 * The database is the only copy of the user's data (it lives in this browser's
 * IndexedDB, and sync is not wired up yet), so these give a way to back it up
 * before a risky app update and to recover if a migration can't apply to the
 * existing data.
 */

// Emscripten's IDBFS uses the FS mount path as the IndexedDB database name, and
// PGlite mounts an `idb://<name>` store at `/pglite/<name>`.
const IDB_NAME = `/pglite/${DATA_DIR.replace("idb://", "")}`

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Dumps the entire on-device database to a single downloaded file. */
export async function downloadBackup(pg: AppPGlite): Promise<void> {
  const dump = await pg.dumpDataDir("auto")
  const gzipped = "name" in dump && dump.name.endsWith(".gz")
  const url = URL.createObjectURL(dump)
  try {
    const link = document.createElement("a")
    link.href = url
    link.download = `dv-books-backup-${todayStamp()}.${gzipped ? "tar.gz" : "tar"}`
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Erases the on-device database. The app re-seeds sample data on the next boot.
 * Pass the open handle (when there is one) so it can be closed first; otherwise
 * the IndexedDB delete can hang on an open connection.
 */
export async function resetDatabase(pg: AppPGlite | null): Promise<void> {
  await closeQuietly(pg)
  await deleteIndexedDb(IDB_NAME)
}

/**
 * Replaces the on-device database with a backup produced by
 * {@link downloadBackup}. The caller should reload afterward so the app boots
 * (and runs migrations) against the restored data.
 */
export async function restoreBackup(
  file: File | Blob,
  pg: AppPGlite | null,
): Promise<void> {
  await closeQuietly(pg)
  // PGlite resumes an existing store and ignores `loadDataDir`, so the current
  // database must be cleared before the backup can be loaded into it.
  await deleteIndexedDb(IDB_NAME)

  const [{ PGlite }, { live }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite/live"),
  ])
  const restored = await PGlite.create(DATA_DIR, {
    loadDataDir: file,
    extensions: { live },
  })
  await restored.close()
}

async function closeQuietly(pg: AppPGlite | null): Promise<void> {
  try {
    await pg?.close()
  } catch {
    // We're tearing the database down anyway — a close error doesn't matter.
  }
}

function deleteIndexedDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name)
    // Resolve on any outcome: a failed/blocked delete shouldn't strand the UI.
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}
