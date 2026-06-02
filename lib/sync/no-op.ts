import type { SyncEngine, SyncStatus } from "./types"

/**
 * The current engine: everything stays in the local PGlite database and nothing
 * is sent anywhere. Implements the full {@link SyncEngine} contract so wiring a
 * real engine later is a drop-in replacement.
 */
export class LocalOnlySyncEngine implements SyncEngine {
  private status: SyncStatus = {
    state: "disabled",
    pending: 0,
    lastSyncedAt: null,
    message: "Local-only — data is stored on this device.",
  }
  private listeners = new Set<(status: SyncStatus) => void>()

  async start(): Promise<void> {
    // No remote yet. A real engine would open its replication stream here.
  }

  async stop(): Promise<void> {
    // Nothing to tear down.
  }

  getStatus(): SyncStatus {
    return this.status
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener)
    listener(this.status)
    return () => this.listeners.delete(listener)
  }
}
