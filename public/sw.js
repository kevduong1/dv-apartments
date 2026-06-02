/*
 * DV Books service worker — gives the installed app offline access.
 *
 * The data already lives on-device (Postgres/PGlite in IndexedDB), but without
 * a service worker the browser still has to fetch the HTML/JS/CSS/WASM shell
 * over the network — so opening the app with Wi-Fi off failed with
 * "Safari can't open the page". This worker caches that shell so the app
 * boots with no connection.
 *
 * Strategy:
 *   - Navigations: network-first, falling back to the cached shell offline.
 *   - Everything else (Next chunks, CSS, fonts, the Postgres WASM): cache-first
 *     with a background refresh, so repeat loads are instant and work offline.
 *
 * Hashed assets are cached the first time they're requested while online, so a
 * single online visit after install primes the cache for offline use.
 */

// Bump this to retire old caches when the caching logic changes.
const CACHE_VERSION = "v1"
const CACHE_NAME = `dv-books-${CACHE_VERSION}`

// Known up front; hashed assets are added at runtime.
const APP_SHELL = ["/", "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      // Don't block activation if a shell URL can't be fetched at install time.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      )
      await self.clients.claim()
    })(),
  )
})

// Allow the page to activate a waiting worker immediately.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // App navigations: prefer the network so deploys land, but fall back to the
  // cached shell so the app still opens offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, response.clone())
          return response
        } catch {
          const cache = await caches.open(CACHE_NAME)
          return (
            (await cache.match(request)) ||
            (await cache.match("/")) ||
            Response.error()
          )
        }
      })(),
    )
    return
  }

  // Static assets: serve from cache first for instant, offline-capable loads,
  // and refresh the cached copy in the background while online.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(request)
      const fromNetwork = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
        .catch(() => undefined)
      return cached || (await fromNetwork) || Response.error()
    })(),
  )
})
