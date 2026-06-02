"use client"

import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

/**
 * Registers the service worker (`/public/sw.js`) so the app loads offline once
 * installed, and gates app updates behind a blocking "Click to update" prompt.
 *
 * How updating works:
 *   - A new deploy ships a new worker. Because `sw.js` no longer calls
 *     `skipWaiting()` on install, the new worker installs and then *waits*
 *     instead of taking over silently.
 *   - We detect that waiting worker and show a full-screen overlay.
 *   - Clicking "Click to update" messages the worker to `skipWaiting()`; once it
 *     takes control (`controllerchange`) we reload so everyone runs fresh code.
 *   - We re-check for updates whenever the app returns to the foreground, which
 *     is what makes the prompt fire reliably when an iOS home-screen app is
 *     reopened from a frozen snapshot.
 *
 * Only runs in production builds — a caching service worker would otherwise
 * fight with the dev server's hot-reloaded chunks.
 */
export function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [updating, setUpdating] = useState(false)
  // Set when the user clicks update, so the first-install `controllerchange`
  // (from the worker claiming the page) doesn't trigger an unwanted reload.
  const updateClicked = useRef(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    let registration: ServiceWorkerRegistration | null = null

    const onControllerChange = () => {
      if (!updateClicked.current) return
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    // Only a real *update* (a worker is already in control) should prompt;
    // the first install has nothing to replace.
    const promptIfUpdate = (worker: ServiceWorker | null) => {
      if (worker && navigator.serviceWorker.controller) setWaitingWorker(worker)
    }

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })

        // An update may have finished installing in a previous session.
        promptIfUpdate(registration.waiting)

        registration.addEventListener("updatefound", () => {
          const installing = registration?.installing
          if (!installing) return
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") promptIfUpdate(installing)
          })
        })
      } catch (error) {
        console.error("Service worker registration failed:", error)
      }
    }

    if (document.readyState === "complete") register()
    else window.addEventListener("load", register)

    // Foreground → check for a new version (covers iOS resuming the app).
    const onVisible = () => {
      if (document.visibilityState === "visible") registration?.update()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("load", register)
    }
  }, [])

  if (!waitingWorker) return null

  const applyUpdate = () => {
    setUpdating(true)
    updateClicked.current = true
    waitingWorker.postMessage("SKIP_WAITING")
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sw-update-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center text-card-foreground shadow-lg">
        <h2 id="sw-update-title" className="text-lg font-semibold">
          Update available
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A new version of DV Books is ready. Your saved data stays on this device.
        </p>
        <Button className="mt-4 w-full" onClick={applyUpdate} disabled={updating}>
          {updating ? "Updating…" : "Click to update"}
        </Button>
      </div>
    </div>
  )
}
