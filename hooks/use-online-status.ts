"use client"

import { useSyncExternalStore } from "react"

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

/**
 * Tracks browser connectivity via the `online`/`offline` events.
 * `useSyncExternalStore` is the right primitive here — it subscribes to an
 * external source and stays SSR-safe (server snapshot is `true`).
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}
