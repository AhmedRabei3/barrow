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
const clients: Map<
  string,
  Set<ExtendedWebSocket>
> = wsGlobals.__mashhoorWsClients ?? new Map<string, Set<ExtendedWebSocket>>();

wsGlobals.__mashhoorWsClients = clients;

/**
 * تهيئة WebSocket server
 */
export function initializeWebSocketServer(config: WebSocketServerConfig) {
  if (wss) {
    logger.debug("WebSocket server already initialized");
    return wss;
  }

  wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false, // تقليل الضغط لسرعة أفضل
  });
  wsGlobals.__mashhoorWss = wss;

  logger.debug("Setting up WebSocket upgrade handler...");

  // معالجة أخطاء WebSocket server
  wss.on("error", (error: Error) => {
    logger.error("WebSocket Server Error:", error.message);
  });

  /* معالجة upgrade من HTTP إلى WebSocket */
  config.server.on("upgrade", (request: IncomingMessage, socket, head) => {
    logger.debug("Upgrade event received from:", request.url);

    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (pathname !== "/ws") {
      return;
    }

    const userId = url.searchParams.get("userId");

    logger.debug(`Extracted userId: ${userId}`);

    if (!userId) {
      logger.warn("No userId in request, destroying socket");
      socket.destroy();
      return;
    }

    logger.debug(`Valid userId ${userId}, handling upgrade...`);

    wss!.handleUpgrade(request, socket, head, (ws: WSWebSocket) => {
      const extWs = ws as ExtendedWebSocket;
      extWs.userId = userId;
      logger.debug(
        `Upgrade successful for user ${userId}, emitting connection event`,
      );
      wss!.emit("connection", extWs, request);
    });
  });

  /* معالجة الاتصالات الجديدة */
  wss.on("connection", (ws: ExtendedWebSocket) => {
    const userId = ws.userId!;

    logger.debug(`Client connected: ${userId}`);
    logger.debug(`Total clients now: ${clients.size + 1}`);

    /* إضافة المستخدم إلى المجموعة */
    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId)!.add(ws);

    /* Health check */
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
      logger.debug(`Pong received from ${userId}`);
    });

    /* معالجة الرسائل */
    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "ping":
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "pong" }));
            }
            break;

          case "mark_read":
            /* سيتم التعامل معه في البيانات */
            break;

          default:
            logger.warn(`Unknown message type: ${message.type} from ${userId}`);
        }
      } catch (error) {
        logger.error(`Error processing message from ${userId}:`, error);
      }
    });

    /* معالجة الفصل */
    ws.on("close", (code: number, reason: string) => {
      logger.debug(
        `Client disconnected: ${userId} (code: ${code}, reason: ${reason || "no reason"})`,
      );
      clients.get(userId)?.delete(ws);

      if (clients.get(userId)?.size === 0) {
        clients.delete(userId);
        logger.debug(`Removed user ${userId} from clients map`);
      }
    });

    /* معالجة الأخطاء */
    ws.on("error", (error: Error) => {
      logger.error(
        `WebSocket error for ${userId}:`,
        error.message,
        error.stack,
      );
    });

    /* إرسال رسالة ترحيب */
    if (ws.readyState === WebSocket.OPEN) {
      // تأخير صغير للتأكد من استقرار الاتصال
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(
              JSON.stringify({
                type: "connected",
                message: "Successfully connected to WebSocket server",
              }),
            );
            logger.debug(`Welcome message sent to ${userId}`);
          } catch (error) {
            logger.error(`Error sending welcome message to ${userId}:`, error);
          }
        } else {
          logger.warn(
            `WebSocket closed before sending welcome message (state: ${ws.readyState})`,
          );
        }
      }, 50); // تأخير 50ms فقط
    } else {
      logger.warn(
        `WebSocket not open when trying to send welcome message (state: ${ws.readyState})`,
      );
    }
  });

  /* Health check كل 30 ثانية */
  if (wsGlobals.__mashhoorWsHeartbeat) {
    clearInterval(wsGlobals.__mashhoorWsHeartbeat);
  }

  wsGlobals.__mashhoorWsHeartbeat = setInterval(() => {
    logger.debug(`Health check... (${wss!.clients.size} connected clients)`);

    wss!.clients.forEach((ws: WSWebSocket) => {
      const extWs = ws as ExtendedWebSocket;

      if (extWs.isAlive === false) {
        logger.warn(
          `Client ${extWs.userId} not responding to ping, terminating...`,
        );
        ws.terminate();
        return;
      }

      extWs.isAlive = false;
      ws.ping();
    });
  }, 30000);

  logger.info("WebSocket server initialized");

  return wss;
}

/**
 * إرسال إشعار لمستخدم محدد
 */
export function sendNotificationToUser(
  userId: string,
  notification: RealtimeNotificationPayload,
) {
  const userClients = clients.get(userId);

  if (!userClients || userClients.size === 0) {
    logger.debug(`No connected clients for user ${userId}`);
    return;
  }

  const message = JSON.stringify({
    type: "notification",
    data: notification,
  });

  userClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });

  logger.debug(
    `📨 Notification sent to user ${userId} (${userClients.size} client(s))`,
  );
}

/**
 * إرسال إشعار لمجموعة من المستخدمين
 */
export function sendNotificationToUsers(
  userIds: string[],
  notification: RealtimeNotificationPayload,
) {
  userIds.forEach((userId) => {
    sendNotificationToUser(userId, notification);
  });
}

/**
 * بث إشعار لجميع المستخدمين المتصلين
 */
export function broadcastNotification(
  notification: RealtimeNotificationPayload,
) {
  if (!wss) {
    logger.warn("WebSocket server not initialized");
    return;
  }

  const message = JSON.stringify({
    type: "notification",
    data: notification,
  });

  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });

  logger.debug(
    `📢 Broadcast notification to all users (${wss.clients.size} client(s))`,
  );
}

/**
 * الحصول على عدد المستخدمين المتصلين
 */
export function getConnectedUsersCount(): number {
  return clients.size;
}

/**
 * التحقق إن كان لدى المستخدم اتصال WebSocket نشط
 */
export function isUserConnected(userId: string): boolean {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) {
    return false;
  }

  for (const socket of userClients) {
    if (socket.readyState === WebSocket.OPEN) {
      return true;
    }
  }

  return false;
}

/**
 * الحصول على WebSocket server
 */
export function getWebSocketServer() {
  return wss;
}
