import { z } from "zod";

export const CHAT_EVENT_TYPES = [
  "chat_message",
  "message_delivered",
  "message_seen",
  "typing_start",
  "typing_stop",
  "user_online",
  "user_offline",
  "notification",
  "ping",
  "pong",
  "presence_subscribe",
  "presence_unsubscribe",
  "connected",
] as const;

export type ChatEventType = (typeof CHAT_EVENT_TYPES)[number];

export const messageStatusSchema = z.enum([
  "sending",
  "sent",
  "delivered",
  "seen",
]);

export type MessageStatus = z.infer<typeof messageStatusSchema>;

export const chatMessagePayloadSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  senderId: z.string().min(1),
  recipientId: z.string().min(1),
  text: z.string().min(1),
  createdAt: z.string().min(1),
  clientMessageId: z.string().trim().min(1).optional(),
  status: messageStatusSchema.optional(),
  deliveredAt: z.string().trim().min(1).optional(),
  seenAt: z.string().trim().min(1).optional(),
});

export type ChatMessagePayload = z.infer<typeof chatMessagePayloadSchema>;

export const chatMessageEventSchema = z.object({
  type: z.literal("chat_message"),
  conversationId: z.string().min(1),
  data: chatMessagePayloadSchema,
});

export const messageDeliveredEventSchema = z.object({
  type: z.literal("message_delivered"),
  conversationId: z.string().min(1),
  messageIds: z.array(z.string().min(1)).min(1),
  deliveredBy: z.string().min(1),
  deliveredAt: z.string().min(1),
});

export const messageSeenEventSchema = z.object({
  type: z.literal("message_seen"),
  conversationId: z.string().min(1),
  messageIds: z.array(z.string().min(1)).min(1),
  seenBy: z.string().min(1),
  seenAt: z.string().min(1),
});

export const typingEventSchema = z.object({
  type: z.union([z.literal("typing_start"), z.literal("typing_stop")]),
  conversationId: z.string().min(1),
  userId: z.string().min(1),
});

export const presenceEventSchema = z.object({
  type: z.union([z.literal("user_online"), z.literal("user_offline")]),
  userId: z.string().min(1),
  lastSeen: z.string().nullable().optional(),
});

export const notificationEventSchema = z.object({
  type: z.literal("notification"),
  data: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    message: z.string().min(1),
    type: z.string().min(1),
    createdAt: z.string().min(1),
    isRead: z.boolean(),
  }),
});

export const connectedEventSchema = z.object({
  type: z.literal("connected"),
  userId: z.string().min(1),
});

export const pongEventSchema = z.object({
  type: z.literal("pong"),
  ts: z.string().min(1),
});

export const chatServerEventSchema = z.union([
  chatMessageEventSchema,
  messageDeliveredEventSchema,
  messageSeenEventSchema,
  typingEventSchema,
  presenceEventSchema,
  notificationEventSchema,
  connectedEventSchema,
  pongEventSchema,
]);

export type ChatServerEvent = z.infer<typeof chatServerEventSchema>;

export const pingClientEventSchema = z.object({
  type: z.literal("ping"),
});

export const typingClientEventSchema = z.object({
  type: z.union([z.literal("typing_start"), z.literal("typing_stop")]),
  conversationId: z.string().min(1),
  recipientId: z.string().min(1),
});

export const deliveredClientEventSchema = z.object({
  type: z.literal("message_delivered"),
  conversationId: z.string().min(1),
  senderId: z.string().min(1),
  messageIds: z.array(z.string().min(1)).min(1).max(200),
});

export const seenClientEventSchema = z.object({
  type: z.literal("message_seen"),
  conversationId: z.string().min(1),
  senderId: z.string().min(1),
  messageIds: z.array(z.string().min(1)).max(200).optional(),
});

export const presenceSubscribeClientEventSchema = z.object({
  type: z.literal("presence_subscribe"),
  userIds: z.array(z.string().min(1)).min(1).max(50),
});

export const presenceUnsubscribeClientEventSchema = z.object({
  type: z.literal("presence_unsubscribe"),
  userIds: z.array(z.string().min(1)).min(1).max(50),
});

export const chatClientEventSchema = z.union([
  pingClientEventSchema,
  typingClientEventSchema,
  deliveredClientEventSchema,
  seenClientEventSchema,
  presenceSubscribeClientEventSchema,
  presenceUnsubscribeClientEventSchema,
]);

export type ChatClientEvent = z.infer<typeof chatClientEventSchema>;

export type RealtimeEnvelope = {
  id: string;
  targetUserIds: string[];
  event: ChatServerEvent;
};
