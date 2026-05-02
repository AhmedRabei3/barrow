// public/firebase-messaging-sw.js
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

messaging.onBackgroundMessage(function (payload) {
  const conversationId = payload?.data?.conversationId || "";

  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon-192x192.png",
    data: {
      conversationId,
      markReadUrl: payload?.data?.markReadUrl || "/api/chat/messages/read",
    },
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const conversationId = event.notification?.data?.conversationId || "";
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
          // noop: opening the chat still gives the user access to mark read in-app.
        }
      }

      const targetUrl = conversationId
        ? `/messages?conversationId=${encodeURIComponent(conversationId)}`
        : "/messages";

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
