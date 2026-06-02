import { LocalOnlySyncEngine } from "./no-op"
import type { SyncEngine } from "./types"

export type { SyncEngine, SyncState, SyncStatus } from "./types"

/**
 * The app's sync engine. Swap this line for a real implementation (e.g. an
 * ElectricSQL- or outbox-backed engine) once Supabase is connected — nothing
 * else has to change.
 */
export const sync: SyncEngine = new LocalOnlySyncEngine()
