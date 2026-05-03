import { randomUUID } from "crypto";
import { IncomingMessage, Server as HTTPServer } from "http";
import { getToken } from "next-auth/jwt";
import type { GetTokenParams } from "next-auth/jwt";
import { WebSocket as WSWebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import type {
  ChatServerEvent,
  RealtimeEnvelope,
} from "@/lib/chatRealtimeProtocol";
import {
  chatClientEventSchema,
  chatServerEventSchema,
} from "@/lib/chatRealtimeProtocol";
import { duplicateRedisClient, getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";
import {
  markConversationMessagesSeen,
  markMessagesDelivered,
} from "@/server/chat/messageStatus";

interface ExtendedWebSocket extends WSWebSocket {
  userId: string;
  socketId: string;
  isAlive: boolean;
  cleanedUp?: boolean;
}

type RedisDuplicateInstance = Awaited<ReturnType<typeof duplicateRedisClient>>;

type WSGlobals = typeof globalThis & {
  __wss?: WebSocketServer;
  __clients?: Map<string, Set<ExtendedWebSocket>>;
  __presenceWatchers?: Map<string, Set<ExtendedWebSocket>>;
  __watchedUsersBySocket?: WeakMap<ExtendedWebSocket, Set<string>>;
  __heartbeat?: NodeJS.Timeout;
  __wsRedisSubscriber?: RedisDuplicateInstance | null;
  __wsRedisSubscriberReady?: boolean;
  __wsInitPromise?: Promise<WebSocketServer>;
  __wsUpgradeAttached?: boolean;
};

type NotificationPayload = {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
};

const g = globalThis as WSGlobals;
const CHAT_EVENTS_CHANNEL = "chat:events";
const PRESENCE_EVENTS_CHANNEL = "chat:presence";

const realtimeEnvelopeSchema: z.ZodType<RealtimeEnvelope> = z.object({
  id: z.string().min(1),
  targetUserIds: z.array(z.string().min(1)).min(1),
  event: chatServerEventSchema,
});

const clients = g.__clients ?? new Map<string, Set<ExtendedWebSocket>>();
const presenceWatchers =
  g.__presenceWatchers ?? new Map<string, Set<ExtendedWebSocket>>();
const watchedUsersBySocket =
  g.__watchedUsersBySocket ?? new WeakMap<ExtendedWebSocket, Set<string>>();

g.__clients = clients;
g.__presenceWatchers = presenceWatchers;
g.__watchedUsersBySocket = watchedUsersBySocket;

let wss = g.__wss ?? null;

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const safeSend = (ws: ExtendedWebSocket, payload: ChatServerEvent) => {
  if (ws.readyState !== WSWebSocket.OPEN) {
    return;
  }

  ws.send(JSON.stringify(payload));
};

const emitToUsers = (userIds: string[], event: ChatServerEvent) => {
  for (const userId of unique(userIds)) {
    const sockets = clients.get(userId);
    if (!sockets || sockets.size === 0) {
      continue;
    }

    sockets.forEach((ws) => {
      safeSend(ws, event);
    });
  }
};

const emitPresenceToWatchers = (event: ChatServerEvent) => {
  if (event.type !== "user_online" && event.type !== "user_offline") {
    return;
  }

  const watchers = presenceWatchers.get(event.userId);
  if (!watchers || watchers.size === 0) {
    return;
  }

  watchers.forEach((ws) => safeSend(ws, event));
};

const publishRealtimeEnvelope = async (envelope: RealtimeEnvelope) => {
  const redis = await getRedisClient();

  if (!redis || !redis.isOpen) {
    emitToUsers(envelope.targetUserIds, envelope.event);
    return;
  }

  try {
    await redis.publish(CHAT_EVENTS_CHANNEL, JSON.stringify(envelope));
  } catch (error) {
    logger.error("Failed to publish realtime envelope, using local fallback.", error);
    emitToUsers(envelope.targetUserIds, envelope.event);
  }
};

const publishPresenceEvent = async (
  event: Extract<ChatServerEvent, { type: "user_online" | "user_offline" }>,
) => {
  const redis = await getRedisClient();

  if (!redis || !redis.isOpen) {
    emitPresenceToWatchers(event);
    return;
  }

  try {
    await redis.publish(PRESENCE_EVENTS_CHANNEL, JSON.stringify(event));
  } catch (error) {
    logger.error("Failed to publish presence event, using local fallback.", error);
    emitPresenceToWatchers(event);
  }
};

const ensureRedisSubscriptions = async () => {
  if (g.__wsRedisSubscriberReady && g.__wsRedisSubscriber?.isOpen) {
    return;
  }

  const redisSubscriber = await duplicateRedisClient();
  if (!redisSubscriber || !redisSubscriber.isOpen) {
    g.__wsRedisSubscriber = null;
    g.__wsRedisSubscriberReady = false;
    logger.warn("Realtime Redis subscriber unavailable, running local-only mode.");
    return;
  }

  try {
    await redisSubscriber.subscribe(CHAT_EVENTS_CHANNEL, (rawMessage: string) => {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawMessage);
      } catch {
        logger.warn("Invalid JSON on realtime Redis channel.");
        return;
      }

      const parsed = realtimeEnvelopeSchema.safeParse(parsedJson);

      if (!parsed.success) {
        logger.warn("Invalid realtime envelope received from Redis.");
        return;
      }

      emitToUsers(parsed.data.targetUserIds, parsed.data.event);
    });

    await redisSubscriber.subscribe(PRESENCE_EVENTS_CHANNEL, (rawMessage: string) => {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawMessage);
      } catch {
        logger.warn("Invalid JSON on presence Redis channel.");
        return;
      }

      const parsed = chatServerEventSchema.safeParse(parsedJson);

      if (!parsed.success) {
        logger.warn("Invalid presence event received from Redis.");
        return;
      }

      emitPresenceToWatchers(parsed.data);
    });

    g.__wsRedisSubscriber = redisSubscriber;
    g.__wsRedisSubscriberReady = true;
    logger.info("Realtime Redis subscriptions ready.");
  } catch (error) {
    logger.error("Failed to subscribe realtime Redis channels.", error);
    g.__wsRedisSubscriber = null;
    g.__wsRedisSubscriberReady = false;
    try {
      await redisSubscriber.quit();
    } catch {
      // noop
    }
  }
};

const detachPresenceSubscriptions = (ws: ExtendedWebSocket) => {
  const watchedUsers = watchedUsersBySocket.get(ws);
  if (!watchedUsers) {
    return;
  }

  watchedUsers.forEach((watchedUserId) => {
    const watchers = presenceWatchers.get(watchedUserId);
    if (!watchers) {
      return;
    }

    watchers.delete(ws);
    if (watchers.size === 0) {
      presenceWatchers.delete(watchedUserId);
    }
  });

  watchedUsersBySocket.delete(ws);
};

const subscribePresence = async (ws: ExtendedWebSocket, userIds: string[]) => {
  const cleanedUserIds = unique(userIds).filter((userId) => userId !== ws.userId);
  if (cleanedUserIds.length === 0) {
    return;
  }

  const watchedUsers = watchedUsersBySocket.get(ws) ?? new Set<string>();

  for (const userId of cleanedUserIds) {
    watchedUsers.add(userId);

    const watchers = presenceWatchers.get(userId) ?? new Set<ExtendedWebSocket>();
    watchers.add(ws);
    presenceWatchers.set(userId, watchers);

    const online = await isUserConnected(userId);
    const lastSeen = online ? null : await getUserLastSeen(userId);

    safeSend(ws, {
      type: online ? "user_online" : "user_offline",
      userId,
      lastSeen,
    });
  }

  watchedUsersBySocket.set(ws, watchedUsers);
};

const unsubscribePresence = (ws: ExtendedWebSocket, userIds: string[]) => {
  const watchedUsers = watchedUsersBySocket.get(ws);
  if (!watchedUsers) {
    return;
  }

  const targetSet = new Set(unique(userIds));
  if (targetSet.size === 0) {
    return;
  }

  targetSet.forEach((userId) => {
    watchedUsers.delete(userId);

    const watchers = presenceWatchers.get(userId);
    if (!watchers) {
      return;
    }

    watchers.delete(ws);
    if (watchers.size === 0) {
      presenceWatchers.delete(userId);
    }
  });

  if (watchedUsers.size === 0) {
    watchedUsersBySocket.delete(ws);
  } else {
    watchedUsersBySocket.set(ws, watchedUsers);
  }
};

const setUserOnlineState = async (userId: string) => {
  const redis = await getRedisClient();
  if (redis?.isOpen) {
    await redis.sAdd("online_users", userId);
  }

  await publishPresenceEvent({
    type: "user_online",
    userId,
    lastSeen: null,
  });
};

const setUserOfflineState = async (userId: string) => {
  const nowIso = new Date().toISOString();

  const redis = await getRedisClient();
  if (redis?.isOpen) {
    await redis.sRem("online_users", userId);
    await redis.set(`last_seen:${userId}`, nowIso);
  }

  await publishPresenceEvent({
    type: "user_offline",
    userId,
    lastSeen: nowIso,
  });
};

const dispatchTypingEvent = async ({
  type,
  conversationId,
  fromUserId,
  recipientUserId,
}: {
  type: "typing_start" | "typing_stop";
  conversationId: string;
  fromUserId: string;
  recipientUserId: string;
}) => {
  await publishRealtimeEnvelope({
    id: randomUUID(),
    targetUserIds: [recipientUserId],
    event: {
      type,
      conversationId,
      userId: fromUserId,
    },
  });
};

const dispatchDeliveredEvent = async ({
  conversationId,
  messageIds,
  senderId,
  recipientId,
}: {
  conversationId: string;
  messageIds: string[];
  senderId: string;
  recipientId: string;
}) => {
  if (messageIds.length === 0) {
    return;
  }

  await publishRealtimeEnvelope({
    id: randomUUID(),
    targetUserIds: [senderId, recipientId],
    event: {
      type: "message_delivered",
      conversationId,
      messageIds,
      deliveredBy: recipientId,
      deliveredAt: new Date().toISOString(),
    },
  });
};

const dispatchSeenEvent = async ({
  conversationId,
  messageIds,
  senderId,
  readerUserId,
}: {
  conversationId: string;
  messageIds: string[];
  senderId: string;
  readerUserId: string;
}) => {
  if (messageIds.length === 0) {
    return;
  }

  await publishRealtimeEnvelope({
    id: randomUUID(),
    targetUserIds: [senderId, readerUserId],
    event: {
      type: "message_seen",
      conversationId,
      messageIds,
      seenBy: readerUserId,
      seenAt: new Date().toISOString(),
    },
  });
};

const attachUpgradeHandler = (server: HTTPServer) => {
  if (g.__wsUpgradeAttached) {
    return;
  }

  server.on("upgrade", async (req: IncomingMessage, socket, head) => {
    try {
      const url = new URL(req.url ?? "", `http://${req.headers.host}`);
      if (url.pathname !== "/ws") {
        return;
      }

      const token = await getToken({
        req: req as GetTokenParams["req"],
        secret: process.env.NEXTAUTH_SECRET,
      });

      const userId = token?.sub;
      if (!userId) {
        socket.destroy();
        return;
      }

      wss?.handleUpgrade(req, socket, head, (rawSocket) => {
        const ws = rawSocket as ExtendedWebSocket;
        ws.userId = userId;
        ws.socketId = randomUUID();
        ws.isAlive = true;
        ws.cleanedUp = false;
        wss?.emit("connection", ws, req);
      });
    } catch (error) {
      logger.error("WebSocket upgrade failed.", error);
      socket.destroy();
    }
  });

  g.__wsUpgradeAttached = true;
};

const attachConnectionHandler = () => {
  wss?.on("connection", (ws: ExtendedWebSocket) => {
    const userId = ws.userId;
    if (!userId) {
      ws.close();
      return;
    }

    const userSockets = clients.get(userId) ?? new Set<ExtendedWebSocket>();
    const wasOffline = userSockets.size === 0;
    userSockets.add(ws);
    clients.set(userId, userSockets);

    if (wasOffline) {
      void setUserOnlineState(userId);
    }

    safeSend(ws, {
      type: "connected",
      userId,
    });

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (buffer) => {
      void handleClientEvent(ws, buffer.toString());
    });

    const cleanup = async () => {
      if (ws.cleanedUp) {
        return;
      }

      ws.cleanedUp = true;
      detachPresenceSubscriptions(ws);

      const sockets = clients.get(userId);
      if (!sockets) {
        return;
      }

      sockets.delete(ws);
      if (sockets.size === 0) {
        clients.delete(userId);
        await setUserOfflineState(userId);
      }
    };

    ws.on("close", () => {
      void cleanup();
    });

    ws.on("error", () => {
      void cleanup();
    });
  });
};

const handleClientEvent = async (ws: ExtendedWebSocket, rawMessage: string) => {
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawMessage);
  } catch {
    return;
  }

  const parsedEvent = chatClientEventSchema.safeParse(parsedPayload);
  if (!parsedEvent.success) {
    logger.warn("Invalid realtime client event ignored.");
    return;
  }

  const event = parsedEvent.data;

  switch (event.type) {
    case "ping":
      safeSend(ws, { type: "pong", ts: new Date().toISOString() });
      return;

    case "presence_subscribe":
      await subscribePresence(ws, event.userIds);
      return;

    case "presence_unsubscribe":
      unsubscribePresence(ws, event.userIds);
      return;

    case "typing_start":
    case "typing_stop":
      await dispatchTypingEvent({
        type: event.type,
        conversationId: event.conversationId,
        fromUserId: ws.userId,
        recipientUserId: event.recipientId,
      });
      return;

    case "message_delivered": {
      const updateResult = await markMessagesDelivered({
        conversationId: event.conversationId,
        senderId: event.senderId,
        recipientId: ws.userId,
        messageIds: event.messageIds,
      });

      await dispatchDeliveredEvent({
        conversationId: event.conversationId,
        messageIds: updateResult.updatedMessageIds,
        senderId: event.senderId,
        recipientId: ws.userId,
      });
      return;
    }

    case "message_seen": {
      const updateResult = await markConversationMessagesSeen({
        conversationId: event.conversationId,
        readerUserId: ws.userId,
        senderId: event.senderId,
        messageIds: event.messageIds,
      });

      await dispatchSeenEvent({
        conversationId: event.conversationId,
        messageIds: updateResult.updatedMessageIds,
        senderId: event.senderId,
        readerUserId: ws.userId,
      });
      return;
    }
  }
};

const ensureHeartbeat = () => {
  if (g.__heartbeat) {
    clearInterval(g.__heartbeat);
  }

  g.__heartbeat = setInterval(() => {
    for (const sockets of clients.values()) {
      sockets.forEach((ws) => {
        if (ws.isAlive === false) {
          ws.terminate();
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }
  }, 30_000);
};

export async function initializeWebSocketServer(server: HTTPServer) {
  if (wss) {
    return wss;
  }

  if (g.__wsInitPromise) {
    return g.__wsInitPromise;
  }

  g.__wsInitPromise = (async () => {
    wss = new WebSocketServer({ noServer: true });
    g.__wss = wss;

    await ensureRedisSubscriptions();
    attachUpgradeHandler(server);
    attachConnectionHandler();
    ensureHeartbeat();

    logger.info("Production WebSocket server ready.");
    return wss;
  })();

  try {
    return await g.__wsInitPromise;
  } finally {
    g.__wsInitPromise = undefined;
  }
}

export async function publishChatMessageEvent({
  conversationId,
  message,
}: {
  conversationId: string;
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    recipientId: string;
    text: string;
    createdAt: string;
    clientMessageId?: string;
    status?: "sent" | "delivered" | "seen";
    deliveredAt?: string | null;
    seenAt?: string | null;
  };
}) {
  const normalizedMessage = {
    ...message,
    deliveredAt: message.deliveredAt ?? undefined,
    seenAt: message.seenAt ?? undefined,
  };

  const event = chatServerEventSchema.parse({
    type: "chat_message",
    conversationId,
    data: normalizedMessage,
  });

  await publishRealtimeEnvelope({
    id: randomUUID(),
    targetUserIds: [message.senderId, message.recipientId],
    event,
  });
}

export async function publishMessageSeenEvent({
  conversationId,
  messageIds,
  seenBy,
  targetUserIds,
  seenAt,
}: {
  conversationId: string;
  messageIds: string[];
  seenBy: string;
  targetUserIds: string[];
  seenAt?: string;
}) {
  if (messageIds.length === 0) {
    return;
  }

  const event = chatServerEventSchema.parse({
    type: "message_seen",
    conversationId,
    messageIds,
    seenBy,
    seenAt: seenAt ?? new Date().toISOString(),
  });

  await publishRealtimeEnvelope({
    id: randomUUID(),
    targetUserIds,
    event,
  });
}

export function sendNotificationToUser(userId: string, data: NotificationPayload) {
  const event = chatServerEventSchema.parse({
    type: "notification",
    data,
  });

  void publishRealtimeEnvelope({
    id: randomUUID(),
    targetUserIds: [userId],
    event,
  });
}

export async function isUserConnected(userId: string): Promise<boolean> {
  try {
    const redis = await getRedisClient();

    if (redis?.isOpen) {
      const exists = await redis.sIsMember("online_users", userId);
      if (exists) {
        return true;
      }
    }

    return Boolean(clients.get(userId)?.size);
  } catch {
    return Boolean(clients.get(userId)?.size);
  }
}

export async function getUserLastSeen(userId: string): Promise<string | null> {
  try {
    const redis = await getRedisClient();
    if (!redis?.isOpen) {
      return null;
    }

    return await redis.get(`last_seen:${userId}`);
  } catch {
    return null;
  }
}
