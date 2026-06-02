/**
 * Supabase seam — intentionally NOT connected yet.
 *
 * Development runs entirely against local PGlite with no hosted database. When
 * you're ready to sync:
 *   1. `pnpm add @supabase/supabase-js`
 *   2. Fill `.env.local` from `.env.example`
 *   3. Apply `db/migrations` to Supabase (`drizzle-kit migrate` with DATABASE_URL)
 *   4. Implement a real engine in `lib/sync` and create the client below.
 */

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const

/** True once both env vars are present — gate sync features on this. */
export const isSupabaseConfigured = Boolean(
  supabaseConfig.url && supabaseConfig.anonKey,
)
