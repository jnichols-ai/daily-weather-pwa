// Minimal offline shell. We deliberately do NOT cache the /api/* data routes —
// weather data must always be fetched fresh, never served stale from cache.
const CACHE_NAME = "daily-weather-shell-v1";
const SHELL_ASSETS = ["/", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return; // always network for data

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
