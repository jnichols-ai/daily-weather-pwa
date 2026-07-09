// Service worker for Daily Weather PWA.
//
// Strategy:
//   /api/*               → always network (weather data must never be stale)
//   navigation (HTML)    → network-first, cache as offline fallback only
//   /_next/static/*      → cache-first (content-hashed filenames, safe forever)
//   everything else      → network-first, cache as offline fallback
//
// Bump CACHE_NAME whenever you want to force all clients to re-fetch everything.
const CACHE_NAME = "daily-weather-shell-v2";

self.addEventListener("install", (event) => {
  // Pre-cache the bare minimum needed for a useful offline shell.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(["/manifest.json"]))
  );
  // Activate immediately — don't wait for old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete every cache that isn't the current version.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ── API routes: always go to the network, never serve from cache ──────────
  if (url.pathname.startsWith("/api/")) return;

  // ── Navigation (HTML page requests): network-first ────────────────────────
  // A normal refresh or link click always fetches the latest HTML; we only
  // fall back to the cache if the user is genuinely offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ── Hashed static assets: cache-first ────────────────────────────────────
  // Next.js content-hashes every JS/CSS chunk, so a cache hit is always
  // correct; new deploys produce new filenames that won't be in cache.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return res;
          })
      )
    );
    return;
  }

  // ── Everything else: network-first, cache as offline fallback ─────────────
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
