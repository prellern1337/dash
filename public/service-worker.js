const VERSION = "market-dashboard-pwa-standalone-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Keep this service worker network-first/no-cache to avoid stale dashboard issues.
// It exists mainly so Android/Chrome can treat the site as installable.
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  event.respondWith(fetch(event.request));
});
