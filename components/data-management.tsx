"use client"

import { useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { downloadBackup, resetDatabase, restoreBackup } from "@/db/backup"
import type { AppPGlite } from "@/db/client"

type Busy = "backup" | "restore" | "reset" | null

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Backup / restore / reset controls for the on-device database. Used both on
 * the Settings page (with the live handle from context) and on the recovery
 * screen when boot fails (with the handle salvaged from the failed boot, which
 * may be `null` if the database couldn't even be opened).
 */
export function DataManagement({ pg }: { pg: AppPGlite | null }) {
  const [busy, setBusy] = useState<Busy>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const onBackup = async () => {
    if (!pg) return
    setBusy("backup")
    try {
      await downloadBackup(pg)
      toast.success("Backup downloaded")
    } catch (error) {
      toast.error("Couldn't create backup", { description: message(error) })
    } finally {
      setBusy(null)
    }
  }

  const onRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = "" // allow picking the same file again
    if (!file) return
    setBusy("restore")
    try {
      await restoreBackup(file, pg)
      toast.success("Backup restored — reloading…")
      setTimeout(() => window.location.reload(), 600)
    } catch (error) {
      toast.error("Couldn't restore backup", { description: message(error) })
      setBusy(null)
    }
  }

  const onReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    setBusy("reset")
    try {
      await resetDatabase(pg)
      toast.success("Local data reset — reloading…")
      setTimeout(() => window.location.reload(), 600)
    } catch (error) {
      toast.error("Couldn't reset data", { description: message(error) })
      setBusy(null)
      setConfirmReset(false)
    }
  }

  return (
    <div className="divide-y rounded-xl border">
      <Row
        title="Download a backup"
        description="Save a copy of all your data to this device."
      >
        <Button variant="outline" onClick={onBackup} disabled={!pg || busy !== null}>
          {busy === "backup" ? "Preparing…" : "Download"}
        </Button>
      </Row>

      <Row
        title="Restore from backup"
        description="Replace on-device data with a previously downloaded backup file."
      >
        <input
          ref={fileInput}
          type="file"
          accept=".tar,.gz,.tgz,application/x-tar,application/gzip,application/octet-stream"
          className="hidden"
          onChange={onRestore}
        />
        <Button
          variant="outline"
          onClick={() => fileInput.current?.click()}
          disabled={busy !== null}
        >
          {busy === "restore" ? "Restoring…" : "Choose file"}
        </Button>
      </Row>

      <Row
        title="Reset local data"
        description="Erase everything on this device and start over from the sample data."
      >
        <Button
          variant={confirmReset ? "destructive" : "outline"}
          onClick={onReset}
          disabled={busy !== null}
        >
          {busy === "reset" ? "Resetting…" : confirmReset ? "Confirm reset" : "Reset"}
        </Button>
      </Row>
    </div>
  )
}

function Row({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
