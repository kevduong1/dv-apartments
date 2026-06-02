"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  WifiConnected03Icon,
  WifiDisconnected03Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { sync, type SyncStatus } from "@/lib/sync"
import { cn } from "@/lib/utils"

/**
 * Surfaces connectivity + sync state so the offline-first behavior is visible.
 * Today sync is local-only, so this mostly reflects `navigator.onLine`; once a
 * real engine is wired it will show syncing / synced / pending counts too.
 */
export function SyncStatusBadge({ className }: { className?: string }) {
  const online = useOnlineStatus()
  const [status, setStatus] = useState<SyncStatus>(() => sync.getStatus())

  useEffect(() => sync.subscribe(setStatus), [])

  const view = !online
    ? {
        label: "Offline",
        dot: "bg-amber-500",
        title: "No connection — changes are saved locally and will sync when you're back online.",
        connected: false,
      }
    : status.state === "syncing"
      ? { label: "Syncing…", dot: "bg-sky-500 animate-pulse", title: "Syncing changes.", connected: true }
      : status.state === "error"
        ? { label: "Sync error", dot: "bg-destructive", title: status.message ?? "Sync error.", connected: true }
        : status.state === "disabled"
          ? { label: "Local-only", dot: "bg-muted-foreground", title: status.message ?? "Stored on this device.", connected: true }
          : { label: "Synced", dot: "bg-emerald-500", title: "All changes synced.", connected: true }

  return (
    <Badge variant="outline" title={view.title} className={cn("gap-1.5 font-normal", className)}>
      <span className={cn("size-1.5 rounded-full", view.dot)} />
      <HugeiconsIcon
        icon={view.connected ? WifiConnected03Icon : WifiDisconnected03Icon}
        className="text-muted-foreground"
      />
      <span>
        {view.label}
        {status.pending > 0 ? ` · ${status.pending}` : ""}
      </span>
    </Badge>
  )
}
