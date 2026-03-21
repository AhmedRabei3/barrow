"use client";

let ws: WebSocket | null = null;
let connectedUserId: string | null = null;
let allowReconnect = true;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let heartbeatInterval: NodeJS.Timeout | null = null;
const WS_DEBUG = false;

const wsLog = (...args: unknown[]) => {
  if (!WS_DEBUG) return;
  console.log(...args);
};

export const initializeWebSocket = (userId: string) => {
  allowReconnect = true;

  // تحقق من الاتصالات القائمة
  if (ws) {
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      if (connectedUserId === userId) {
        wsLog(
          `✅ WebSocket already connected or connecting (state: ${ws.readyState})`,
        );
        return ws;
      }

      wsLog(
        `🔁 WebSocket user changed (${connectedUserId} -> ${userId}), reconnecting...`,
      );
      allowReconnect = false;
      ws.close();
      ws = null;
      connectedUserId = null;

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      allowReconnect = true;
    }

    // إذا كان الاتصال مغلقاً، قم بتنظيفه
    if (
      ws &&
      (ws.readyState === WebSocket.CLOSED ||
        ws.readyState === WebSocket.CLOSING)
    ) {
      wsLog("🧹 Cleaning up old closed WebSocket connection");
      ws = null;
      connectedUserId = null;
    }
  }

  try {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    /* الاتصال المباشر بـ WebSocket server مع تمرير userId */
    const wsUrl = `${protocol}://${host}/ws?userId=${encodeURIComponent(userId)}`;

    wsLog(`🔗 Attempting to connect to: ${wsUrl}`);
    ws = new WebSocket(wsUrl);
    connectedUserId = userId;

    ws.onopen = () => {
      wsLog("✅ WebSocket connected, readyState:", ws?.readyState);
      reconnectAttempts = 0;

      /* إرسال ping كل 25 ثانية للبقاء متصلاً */
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: "ping" }));
          } catch (error) {
            console.error("❌ Error sending ping:", error);
          }
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        wsLog("📬 Message received from server:", event.data.substring(0, 100));
        const data = JSON.parse(event.data);

        /* معالجة أنواع الرسائل */
        if (data.type === "notification") {
          wsLog("📨 Notification received:", data.data);
          window.dispatchEvent(
            new CustomEvent("notification", { detail: data.data }),
          );
        } else if (data.type === "connected") {
          wsLog("✅ Connected message from server:", data.message);
        } else if (data.type === "pong") {
          /* heartbeat response - الاتصال حي */
          wsLog("💓 Heartbeat pong received");
        } else {
          wsLog("📩 Unknown message type:", data.type, data);
        }
      } catch (e) {
        console.error("❌ Failed to parse message:", e, "data:", event.data);
      }
    };

    ws.onerror = (error) => {
      // 1006 يأتي بدون error event عادة، لكن سنسجل أي أخطاء أخرى
      console.error("❌ WebSocket error event:", error);
      if (error instanceof ErrorEvent) {
        console.error("❌ Error message:", error.message);
      }
    };

    ws.onclose = (event) => {
      const closeEvent = event as CloseEvent;
      const closedUserId = connectedUserId ?? userId;

      wsLog(
        `❌ WebSocket closed for user: ${closedUserId}`,
        `code: ${closeEvent.code}`,
        `reason: ${closeEvent.reason || "no reason provided"}`,
        `wasClean: ${closeEvent.wasClean}`,
      );

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      ws = null;

      // Retry connection with backoff only when reconnect is allowed
      if (allowReconnect && connectedUserId === closedUserId) {
        attemptReconnect(closedUserId);
      }
    };
  } catch (error) {
    console.error("❌ Failed to initialize WebSocket:", error);
  }

  return ws;
};

const attemptReconnect = (userId: string) => {
  if (!allowReconnect || connectedUserId !== userId) {
    return;
  }

  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    // استخدام تأخير أقصر للمحاولات الأولى
    const delay =
      reconnectAttempts === 1
        ? 500
        : Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);

    wsLog(
      `🔄 Reconnecting in ${delay}ms... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
    );
    setTimeout(() => {
      if (!allowReconnect || connectedUserId !== userId) {
        return;
      }

      wsLog(`🔗 Attempting reconnection (attempt ${reconnectAttempts})...`);
      initializeWebSocket(userId);
    }, delay);
  } else {
    console.error(
      `❌ Max reconnection attempts reached (${MAX_RECONNECT_ATTEMPTS}), giving up`,
    );
    // إعادة تعيين العداد بعد فترة طويلة
    setTimeout(() => {
      if (!allowReconnect || connectedUserId !== userId) {
        return;
      }

      wsLog("🔄 Resetting reconnection counter, will try again");
      reconnectAttempts = 0;
      initializeWebSocket(userId);
    }, 60000);
  }
};

export const closeWebSocket = () => {
  allowReconnect = false;

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }

  connectedUserId = null;
  reconnectAttempts = 0;
};

export const getWebSocket = () => ws;
