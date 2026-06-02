/**
 * Sync contract. Today the only implementation is a local-only no-op (see
 * `./no-op`), but the UI talks to this interface so the engine can be swapped
 * for a real one without touching components.
 *
 * Planned strategy for the shared dataset (a few collaborators editing one set
 * of books): last-write-wins keyed on `updated_at`, soft deletes via
 * `deleted_at`, and an offline write outbox. The schema already carries those
 * columns. Likely engine: ElectricSQL (Postgres ↔ PGlite) against Supabase, or
 * a custom `updated_at`-cursor pull plus outbox push.
 */

export type SyncState = "disabled" | "idle" | "syncing" | "offline" | "error"

export interface SyncStatus {
  state: SyncState
  /** Number of local changes not yet pushed. */
  pending: number
  lastSyncedAt: Date | null
  message?: string
}

export interface SyncEngine {
  start(): Promise<void>
  stop(): Promise<void>
  getStatus(): SyncStatus
  /** Subscribe to status changes. Returns an unsubscribe function. */
  subscribe(listener: (status: SyncStatus) => void): () => void
}
