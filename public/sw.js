const CACHE_NAME = "mashhoor-shell-v3";
const APP_SHELL = ["/manifest.webmanifest", "/images/logo.png"];

const CACHEABLE_DESTINATIONS = new Set(["image", "font", "manifest"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  const isApiRequest = url.pathname.startsWith("/api/");
  const isNextAsset = url.pathname.startsWith("/_next/");
  const isDocumentRequest =
    request.mode === "navigate" || request.destination === "document";
  const isCacheableAsset = CACHEABLE_DESTINATIONS.has(request.destination);

  if (isApiRequest || isNextAsset || isDocumentRequest || !isCacheableAsset) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(request));
    }),
  );
});
