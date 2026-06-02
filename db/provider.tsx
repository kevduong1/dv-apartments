"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { PGliteProvider } from "@electric-sql/pglite-react"

import { getClient, type AppDb, type AppPGlite } from "./client"

const DrizzleContext = createContext<AppDb | null>(null)

/** Access the Drizzle handle for writes. Must be used under `<DbProvider>`. */
export function useDb(): AppDb {
  const db = useContext(DrizzleContext)
  if (!db) throw new Error("useDb must be used within <DbProvider>")
  return db
}

/**
 * Boots the local database on the client and provides it two ways:
 *   - `PGliteProvider` for reactive reads via `useLiveQuery`, and
 *   - `DrizzleContext` (`useDb`) for typed writes.
 *
 * While Postgres-in-WASM compiles, migrates, and seeds on first load, a boot
 * screen is shown. None of this runs during SSR — the provider's effect only
 * fires in the browser.
 */
export function DbProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<{ pg: AppPGlite; db: AppDb } | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true
    getClient()
      .then((c) => {
        if (active) setClient(c)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => {
      active = false
    }
  }, [])

  if (error) return <BootScreen title="Couldn't start the local database" detail={error.message} />
  if (!client) return <BootScreen title="Starting local database…" detail="Compiling Postgres and loading your books." spinner />

  return (
    <PGliteProvider db={client.pg}>
      <DrizzleContext.Provider value={client.db}>{children}</DrizzleContext.Provider>
    </PGliteProvider>
  )
}

function BootScreen({
  title,
  detail,
  spinner = false,
}: {
  title: string
  detail: string
  spinner?: boolean
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      {spinner ? (
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      ) : (
        <div className="size-8 rounded-full bg-destructive/15" />
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}
