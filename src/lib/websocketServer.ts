import { WebSocketServer, WebSocket as WSWebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server as HTTPServer } from "http";
import { logger } from "./logger";

interface ExtendedWebSocket extends WSWebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface WebSocketServerConfig {
  server: HTTPServer;
}

interface RealtimeNotificationPayload {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
}

type WebSocketGlobals = typeof globalThis & {
  __mashhoorWss?: WebSocketServer | null;
  __mashhoorWsClients?: Map<string, Set<ExtendedWebSocket>>;
  __mashhoorWsHeartbeat?: NodeJS.Timeout;
};

const wsGlobals = globalThis as WebSocketGlobals;

let wss: WebSocketServer | null = wsGlobals.__mashhoorWss ?? null;

const clients: Map<string, Set<ExtendedWebSocket>> =
  wsGlobals.__mashhoorWsClients ?? new Map();

wsGlobals.__mashhoorWsClients = clients;

export function initializeWebSocketServer(config: WebSocketServerConfig) {
  if (wss) {
    logger.debug("WebSocket server already initialized");
    return wss;
  }

  wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
  });

  wsGlobals.__mashhoorWss = wss;

  /* ================= UPGRADE ================= */
  config.server.on("upgrade", (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);

    if (url.pathname !== "/ws") return;

    const userId = url.searchParams.get("userId");

    if (!userId) {
      socket.destroy();
      return;
    }

    wss!.handleUpgrade(request, socket, head, (ws) => {
      const extWs = ws as ExtendedWebSocket;
      extWs.userId = userId;

      wss!.emit("connection", extWs, request);
    });
  });

  /* ================= CONNECTION ================= */
  wss.on("connection", (ws: ExtendedWebSocket) => {
    const userId = ws.userId!;

    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }

    clients.get(userId)!.add(ws);

    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    /* ================= MESSAGE ================= */
    ws.on("message", (buffer: Buffer) => {
      try {
        const parsed = JSON.parse(buffer.toString());

        switch (parsed.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;

          case "chat_message": {
            const payload = parsed.payload;

            if (!payload) return;

            const { conversationId, message: msg } = payload;

            if (!msg?.recipientId) return;

            const outgoing = JSON.stringify({
              type: "chat_message",
              data: msg,
              conversationId,
            });

            // recipient
            clients.get(msg.recipientId)?.forEach((client) => {
              if (client.readyState === WSWebSocket.OPEN) {
                client.send(outgoing);
              }
            });

            // sender (multi-tabs sync)
            clients.get(userId)?.forEach((client) => {
              if (client.readyState === WSWebSocket.OPEN) {
                client.send(outgoing);
              }
            });

            break;
          }

          default:
            logger.warn(`Unknown WS type: ${parsed.type}`);
        }
      } catch (err) {
        logger.error("WS message parse error:", err);
      }
    });

    /* ================= CLOSE ================= */
    ws.on("close", () => {
      clients.get(userId)?.delete(ws);

      if (clients.get(userId)?.size === 0) {
        clients.delete(userId);
      }
    });

    ws.on("error", (err) => {
      logger.error(`WS error (${userId}):`, err.message);
    });

    /* welcome */
    setTimeout(() => {
      if (ws.readyState === WSWebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "connected" }));
      }
    }, 50);
  });

  /* ================= HEARTBEAT ================= */
  if (wsGlobals.__mashhoorWsHeartbeat) {
    clearInterval(wsGlobals.__mashhoorWsHeartbeat);
  }

  wsGlobals.__mashhoorWsHeartbeat = setInterval(() => {
    wss!.clients.forEach((ws) => {
      const ext = ws as ExtendedWebSocket;

      if (ext.isAlive === false) {
        ws.terminate();
        return;
      }

      ext.isAlive = false;
      ws.ping();
    });
  }, 30000);

  logger.info("WebSocket server initialized");

  return wss;
}

/* ================= HELPERS ================= */

export function sendNotificationToUser(
  userId: string,
  notification: RealtimeNotificationPayload,
) {
  const sockets = clients.get(userId);

  if (!sockets) return;

  const msg = JSON.stringify({
    type: "notification",
    data: notification,
  });

  sockets.forEach((ws) => {
    if (ws.readyState === WSWebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

export function broadcastNotification(
  notification: RealtimeNotificationPayload,
) {
  if (!wss) return;

  const msg = JSON.stringify({
    type: "notification",
    data: notification,
  });

  wss.clients.forEach((ws) => {
    if (ws.readyState === WSWebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

export function isUserConnected(userId: string): boolean {
  return !!clients.get(userId)?.size;
}