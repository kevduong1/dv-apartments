"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { PGliteProvider } from "@electric-sql/pglite-react"

import { Button } from "@/components/ui/button"
import { DataManagement } from "@/components/data-management"
import { BootError, getClient, type AppDb, type AppPGlite } from "./client"

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
  const [error, setError] = useState<BootError | null>(null)

  useEffect(() => {
    let active = true
    getClient()
      .then((c) => {
        if (active) setClient(c)
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof BootError ? e : new BootError(String(e), null))
        }
      })
    return () => {
      active = false
    }
  }, [])

  if (error) return <RecoveryScreen error={error} />
  if (!client) return <BootScreen title="Starting local database…" detail="Compiling Postgres and loading your books." spinner />

  return (
    <PGliteProvider db={client.pg}>
      <DrizzleContext.Provider value={client.db}>{children}</DrizzleContext.Provider>
    </PGliteProvider>
  )
}

/**
 * Shown when the database can't start — most often because an app update
 * shipped a migration the existing on-device data can't satisfy. Instead of an
 * infinite retry loop, it lets the user download a backup, restore one, or
 * reset, so a breaking migration is recoverable rather than a hard brick.
 */
function RecoveryScreen({ error }: { error: BootError }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-destructive/15">
            <span className="size-3 rounded-full bg-destructive" />
          </div>
          <h1 className="text-base font-semibold">Couldn&apos;t start the local database</h1>
          <p className="text-sm text-muted-foreground">
            This can happen after an app update changes how data is stored. Your data
            lives only on this device — download a backup first, then reset to recover.
          </p>
          <p className="rounded-lg bg-muted px-3 py-2 text-left font-mono text-xs break-words text-muted-foreground">
            {error.message}
          </p>
        </div>
        <DataManagement pg={error.pg} />
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => window.location.reload()}
        >
          Try again
        </Button>
      </div>
    </div>
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
