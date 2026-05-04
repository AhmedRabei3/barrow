// src/app/api/chat/messages/route.ts
// Backed by PostgreSQL via Prisma — no Firestore reads or writes.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { buildChatConversationId } from "@/lib/chatConversation";
import { isUserConnected, publishChatMessageEvent } from "@/lib/websocketServer";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendChatPushNotification } from "@/server/firebase/push";

const sendMessageSchema = z.object({
  recipientUserId: z.string().trim().min(1),
  listingId: z.string().trim().min(1),
  listingTitle: z.string().trim().max(300).optional(),
  itemType: z.string().trim().max(120).optional(),
  text: z.string().trim().min(1).max(2000),
  clientMessageId: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]{8,120}$/)
    .optional(),
});

const parseLimit = (value: string | null) => {
  const parsed = Number(value ?? 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
};

const normalizeMessageText = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

// ── Per-process rate limiter (in-memory) ────────────────────────────────────
type RateLimitState = { count: number; windowStartedAt: number };
type RateLimitGlobals = typeof globalThis & {
  __chatSendRateLimit?: Map<string, RateLimitState>;
};
const rateLimitGlobals = globalThis as RateLimitGlobals;
const sendRateLimitMap =
  rateLimitGlobals.__chatSendRateLimit ?? new Map<string, RateLimitState>();
rateLimitGlobals.__chatSendRateLimit = sendRateLimitMap;
const SEND_RATE_LIMIT_WINDOW_MS = 10_000;
const SEND_RATE_LIMIT_MAX = 12;

const canSendMessageNow = (userId: string) => {
  const now = Date.now();
  const current = sendRateLimitMap.get(userId);
  if (!current || now - current.windowStartedAt > SEND_RATE_LIMIT_WINDOW_MS) {
    sendRateLimitMap.set(userId, { count: 1, windowStartedAt: now });
    return true;
  }
  if (current.count >= SEND_RATE_LIMIT_MAX) return false;
  current.count += 1;
  sendRateLimitMap.set(userId, current);
  return true;
};

// ── GET /api/chat/messages ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const conversationId = req.nextUrl.searchParams.get("conversationId") ?? "";
    if (!conversationId) {
      return NextResponse.json(
        { message: "conversationId is required" },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
    const before = req.nextUrl.searchParams.get("before");

    // Authorization: user must be a participant.
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { participantIds: true },
    });

    if (!conversation) {
      return NextResponse.json({ messages: [], hasMore: false, nextCursor: null });
    }

    if (!conversation.participantIds.includes(userId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    const nextCursor =
      messages.length > 0
        ? (messages[messages.length - 1]!.createdAt.toISOString())
        : null;

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        clientMessageId: m.clientMessageId ?? undefined,
        senderId: m.senderId,
        recipientId: m.recipientId,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
        isRead: m.isRead,
        status: m.status.toLowerCase() as "sent" | "delivered" | "seen",
        deliveredAt: m.deliveredAt?.toISOString() ?? null,
        seenAt: m.seenAt?.toISOString() ?? null,
      })),
      hasMore: messages.length === limit,
      nextCursor,
    });
  } catch (error) {
    logger.error("Failed to load chat messages", error);
    return NextResponse.json(
      { message: "Failed to load messages" },
      { status: 500 },
    );
  }
}

// ── POST /api/chat/messages ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsed = sendMessageSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const senderUserId = session.user.id;
    if (!canSendMessageNow(senderUserId)) {
      return NextResponse.json(
        { message: "Too many messages. Please wait a few seconds." },
        { status: 429 },
      );
    }

    const {
      recipientUserId,
      listingId,
      listingTitle,
      itemType,
      clientMessageId,
    } = parsed.data;
    const text = normalizeMessageText(parsed.data.text);

    if (!text) {
      return NextResponse.json({ message: "Message is empty" }, { status: 400 });
    }
    if (recipientUserId === senderUserId) {
      return NextResponse.json(
        { message: "You cannot start a chat with yourself" },
        { status: 400 },
      );
    }

    const conversationId = buildChatConversationId({
      listingId,
      userAId: senderUserId,
      userBId: recipientUserId,
    });

    // Idempotency: check stable ID before any writes.
    const stableId = clientMessageId
      ? `${senderUserId}_${clientMessageId}`
      : null;

    if (stableId) {
      const existing = await prisma.chatMessage.findUnique({
        where: { stableId },
      });
      if (existing) {
        return NextResponse.json({
          success: true,
          created: false,
          conversationId,
          messageId: existing.id,
          message: {
            id: existing.id,
            conversationId,
            senderId: existing.senderId,
            recipientId: existing.recipientId,
            text: existing.text,
            createdAt: existing.createdAt.toISOString(),
            isRead: existing.isRead,
            status: existing.status.toLowerCase(),
            clientMessageId: existing.clientMessageId ?? undefined,
            deliveredAt: existing.deliveredAt?.toISOString() ?? null,
            seenAt: existing.seenAt?.toISOString() ?? null,
          },
          receiverIsOnline: false,
          pushSent: false,
        });
      }
    }

    const now = new Date();

    // Transaction: upsert conversation + unread counts + create message.
    const { message: newMessage, unreadCountForRecipient } =
      await prisma.$transaction(async (tx) => {
        // Upsert conversation.
        const existing = await tx.chatConversation.findUnique({
          where: { id: conversationId },
          select: { participantNames: true },
        });

        const existingNames =
          (existing?.participantNames as Record<string, string> | null) ?? {};

        const participantNames: Record<string, string> = {
          ...existingNames,
          [senderUserId]: session.user.name ?? "User",
        };

        await tx.chatConversation.upsert({
          where: { id: conversationId },
          create: {
            id: conversationId,
            listingId,
            listingTitle: listingTitle ?? "",
            itemType: itemType ?? "",
            participantIds: [senderUserId, recipientUserId],
            participantNames,
            lastMessage: text,
            lastMessageAt: now,
            lastMessageSenderId: senderUserId,
          },
          update: {
            listingTitle: listingTitle ?? undefined,
            participantNames,
            lastMessage: text,
            lastMessageAt: now,
            lastMessageSenderId: senderUserId,
          },
        });

        // Increment recipient unread, reset sender unread.
        const recipientUnread = await tx.chatUnread.upsert({
          where: {
            conversationId_userId: {
              conversationId,
              userId: recipientUserId,
            },
          },
          create: { conversationId, userId: recipientUserId, count: 1 },
          update: { count: { increment: 1 } },
        });

        await tx.chatUnread.upsert({
          where: {
            conversationId_userId: {
              conversationId,
              userId: senderUserId,
            },
          },
          create: { conversationId, userId: senderUserId, count: 0 },
          update: { count: 0 },
        });

        // Create message.
        const msg = await tx.chatMessage.create({
          data: {
            ...(stableId ? { stableId } : {}),
            clientMessageId: clientMessageId ?? null,
            conversationId,
            senderId: senderUserId,
            recipientId: recipientUserId,
            text,
            createdAt: now,
          },
        });

        return {
          message: msg,
          unreadCountForRecipient: recipientUnread.count,
        };
      });

    const messagePayload = {
      id: newMessage.id,
      conversationId,
      senderId: newMessage.senderId,
      recipientId: newMessage.recipientId,
      text: newMessage.text,
      createdAt: newMessage.createdAt.toISOString(),
      isRead: newMessage.isRead,
      status: newMessage.status.toLowerCase() as "sent",
      clientMessageId: newMessage.clientMessageId ?? undefined,
      deliveredAt: null as string | null,
      seenAt: null as string | null,
    };

    const receiverIsOnline = await isUserConnected(recipientUserId);
    let pushSent = false;

    if (!receiverIsOnline) {
      try {
        const pushResult = await sendChatPushNotification({
          recipientUserId,
          senderName: session.user.name ?? "User",
          listingTitle: listingTitle ?? "",
          previewText: text,
          conversationId,
          unreadCount: unreadCountForRecipient,
        });
        pushSent = pushResult.sent;
      } catch (pushError) {
        logger.warn("Chat message saved but FCM push failed", pushError);
      }
    }

    await publishChatMessageEvent({
      conversationId,
      message: messagePayload,
    });

    return NextResponse.json({
      success: true,
      created: true,
      conversationId,
      messageId: messagePayload.id,
      message: messagePayload,
      receiverIsOnline,
      pushSent,
    });
  } catch (error) {
    logger.error("Failed to send chat message", error);
    return NextResponse.json(
      { message: "Failed to send message" },
      { status: 500 },
    );
  }
}
