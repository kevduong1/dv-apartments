"use client"

import { useEffect } from "react"

/**
 * Registers the service worker (`/public/sw.js`) on the client so the app can
 * load offline once installed to the home screen.
 *
 * Only runs in production builds — a caching service worker would otherwise
 * fight with the dev server's hot-reloaded chunks. Registration is deferred to
 * the `load` event so it never competes with the first paint.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error) => {
          console.error("Service worker registration failed:", error)
        })
    }

    if (document.readyState === "complete") {
      register()
      return
    }

    window.addEventListener("load", register)
    return () => window.removeEventListener("load", register)
  }, [])

  return null
}
