importScripts(
  "https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyAqCAr3Fwp08rCmCnOTY97u1LMR8T_ICXg",
  authDomain: "mashhoor-afea3.firebaseapp.com",
  projectId: "mashhoor-afea3",
  storageBucket: "mashhoor-afea3.appspot.com",
  messagingSenderId: "827380921960",
  appId: "1:827380921960:web:7eb34bce891a9ff6652ddd",
  measurementId: "G-R1419C6D9F",
});

const messaging = firebase.messaging();

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

messaging.onBackgroundMessage(function (payload) {
  const title = payload?.notification?.title || "Barrow";
  const body = payload?.notification?.body || "You have a new message";
  const conversationId = payload?.data?.conversationId || "";
  const clickUrl = payload?.data?.url || "";
  const unreadCount = Number(payload?.data?.unreadCount ?? 1);

  if ("setAppBadge" in self.navigator) {
    self.navigator.setAppBadge(unreadCount).catch(function () {});
  }

  self.registration.showNotification(title, {
    body,
    icon: "/icon-192x192.png",
    badge: "/icon-badge-mono.png",
    tag: conversationId || "chat",
    renotify: true,
    data: {
      conversationId,
      clickUrl,
      unreadCount,
      markReadUrl: payload?.data?.markReadUrl || "/api/chat/messages/read",
    },
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const conversationId = event.notification?.data?.conversationId || "";
  const clickUrl = event.notification?.data?.clickUrl || "";
  const markReadUrl =
    event.notification?.data?.markReadUrl || "/api/chat/messages/read";

  event.waitUntil(
    (async () => {
      if (conversationId) {
        try {
          await fetch(markReadUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId }),
          });
        } catch (error) {
          // noop
        }
      }

      if ("clearAppBadge" in self.navigator) {
        self.navigator.clearAppBadge().catch(function () {});
      }

      const targetUrl = conversationId
        ? `/messages?conversationId=${encodeURIComponent(conversationId)}`
        : clickUrl || "/messages";

      const clientsList = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientsList) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }

      if (clients.openWindow) {
        await clients.openWindow(targetUrl);
      }
    })(),
  );
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
