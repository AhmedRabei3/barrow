"use client";

import type { ChatClientEvent, ChatServerEvent } from "@/lib/chatRealtimeProtocol";
import { chatServerEventSchema } from "@/lib/chatRealtimeProtocol";

let ws: WebSocket | null = null;
let connectedUserId: string | null = null;
let allowReconnect = true;
let reconnectAttempts = 0;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

const listeners = new Set<(event: ChatServerEvent) => void>();
const connectionListeners = new Set<(connected: boolean) => void>();
const MAX_RECONNECT_ATTEMPTS = 8;
const HEARTBEAT_MS = 25_000;

const notifyListeners = (event: ChatServerEvent) => {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // noop
    }
  });
};

const notifyConnectionListeners = (connected: boolean) => {
  connectionListeners.forEach((listener) => {
    try {
      listener(connected);
    } catch {
      // noop
    }
  });
};

const resetHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

const startHeartbeat = () => {
  resetHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(JSON.stringify({ type: "ping" }));
  }, HEARTBEAT_MS);
};

const attemptReconnect = (userId: string) => {
  if (!allowReconnect || connectedUserId !== userId) {
    return;
  }

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    return;
  }

  reconnectAttempts += 1;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 20_000);

  window.setTimeout(() => {
    if (!allowReconnect || connectedUserId !== userId) {
      return;
    }

    initializeWebSocket(userId);
  }, delay);
};

export const initializeWebSocket = (userId: string) => {
  allowReconnect = true;

  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  ) {
    if (connectedUserId === userId) {
      return ws;
    }

    allowReconnect = false;
    ws.close();
    ws = null;
    connectedUserId = null;
    resetHeartbeat();
    allowReconnect = true;
  }

  if (
    ws &&
    (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING)
  ) {
    ws = null;
    connectedUserId = null;
    resetHeartbeat();
  }

  try {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    connectedUserId = userId;
    ws = socket;

    socket.onopen = () => {
      reconnectAttempts = 0;
      startHeartbeat();
      notifyConnectionListeners(true);
    };

    socket.onmessage = (event) => {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(event.data);
      } catch {
        return;
      }

      const parsedEvent = chatServerEventSchema.safeParse(parsedJson);
      if (!parsedEvent.success) {
        return;
      }

      const message = parsedEvent.data;
      notifyListeners(message);

      if (message.type === "notification") {
        window.dispatchEvent(new CustomEvent("notification", { detail: message.data }));
      }

      if (message.type === "chat_message") {
        window.dispatchEvent(
          new CustomEvent("chat_message", {
            detail: {
              data: message.data,
              conversationId: message.conversationId,
            },
          }),
        );
      }
    };

    socket.onclose = () => {
      resetHeartbeat();
      ws = null;
      notifyConnectionListeners(false);
      const currentUserId = connectedUserId;
      if (!currentUserId) {
        return;
      }

      attemptReconnect(currentUserId);
    };
  } catch {
    // noop
  }

  return ws;
};

export const sendWebSocketEvent = (payload: ChatClientEvent) => {
  if (ws?.readyState !== WebSocket.OPEN) {
    return false;
  }

  ws.send(JSON.stringify(payload));
  return true;
};

export const subscribeWebSocketEvents = (
  listener: (event: ChatServerEvent) => void,
) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const subscribeWebSocketConnection = (
  listener: (connected: boolean) => void,
) => {
  connectionListeners.add(listener);
  return () => {
    connectionListeners.delete(listener);
  };
};

export const closeWebSocket = () => {
  allowReconnect = false;
  resetHeartbeat();

  if (ws) {
    ws.close();
  }

  notifyConnectionListeners(false);

  ws = null;
  connectedUserId = null;
  reconnectAttempts = 0;
};

export const getWebSocket = () => ws;

export const isWebSocketConnected = () =>
  ws?.readyState === WebSocket.OPEN;
