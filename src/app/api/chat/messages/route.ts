import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/auth";
import { buildChatConversationId } from "@/lib/chatConversation";
import { isUserConnected, publishChatMessageEvent } from "@/lib/websocketServer";
import { logger } from "@/lib/logger";
import {
  adminFirestore,
  firebaseAdminSetupHint,
  isFirebaseAdminConfigured,
} from "@/server/firebase/admin";
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
  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.max(1, Math.min(100, Math.floor(parsed)));
};

const normalizeMessageText = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

type ConversationDoc = {
  createdAt?: string;
  unreadBy?: Record<string, number>;
  participantNames?: Record<string, string>;
};

type MessageDoc = {
  id?: string;
  senderId?: string;
  recipientId?: string;
  text?: string;
  createdAt?: string;
  isRead?: boolean;
  status?: "sent" | "delivered" | "seen";
  deliveredAt?: string;
  seenAt?: string;
  clientMessageId?: string;
};

type RateLimitState = {
  count: number;
  windowStartedAt: number;
};

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
    sendRateLimitMap.set(userId, {
      count: 1,
      windowStartedAt: now,
    });
    return true;
  }

  if (current.count >= SEND_RATE_LIMIT_MAX) {
    return false;
  }

  current.count += 1;
  sendRateLimitMap.set(userId, current);
  return true;
};

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json(
      { message: firebaseAdminSetupHint },
      { status: 503 },
    );
  }

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

    const before = req.nextUrl.searchParams.get("before");
    const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
    const userId = session.user.id;

    const conversationRef = adminFirestore
      .collection("conversations")
      .doc(conversationId);
    const conversationSnap = await conversationRef.get();

    if (!conversationSnap.exists) {
      return NextResponse.json({ messages: [], hasMore: false, nextCursor: null });
    }

    const conversationData = conversationSnap.data() as
      | { participants?: string[] }
      | undefined;
    if (!conversationData?.participants?.includes(userId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    let query = conversationRef
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (before) {
      query = query.where("createdAt", "<", before);
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const nextCursor = docs.length > 0 ? (docs[docs.length - 1]!.data().createdAt ?? null) : null;

    const messages = docs
      .map((docSnap) => {
        const data = docSnap.data() as MessageDoc;

        return {
          id: data.id ?? docSnap.id,
          clientMessageId: data.clientMessageId,
          senderId: data.senderId ?? "",
          recipientId: data.recipientId ?? "",
          text: data.text ?? "",
          createdAt: data.createdAt ?? "",
          isRead: Boolean(data.isRead),
          status: data.status ?? (data.isRead ? "seen" : "sent"),
          deliveredAt: data.deliveredAt ?? null,
          seenAt: data.seenAt ?? null,
        };
      })
      .reverse();

    return NextResponse.json({
      messages,
      hasMore: snapshot.size === limit,
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

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json(
      { message: firebaseAdminSetupHint },
      { status: 503 },
    );
  }

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

    const nowIso = new Date().toISOString();
    const conversationRef = adminFirestore
      .collection("conversations")
      .doc(conversationId);
    const userRef = adminFirestore.collection("users").doc(recipientUserId);

    const stableMessageId = clientMessageId
      ? `${senderUserId}_${clientMessageId}`
      : conversationRef.collection("messages").doc().id;
    const messageRef = conversationRef.collection("messages").doc(stableMessageId);

    const transactionResult = await adminFirestore.runTransaction(
      async (transaction) => {
        let unreadCountForRecipient = 1;

        const [conversationSnap, messageSnap] = await Promise.all([
          transaction.get(conversationRef),
          transaction.get(messageRef),
        ]);

        if (messageSnap.exists) {
          const existing = messageSnap.data() as MessageDoc;

          return {
            created: false,
            unreadCountForRecipient,
            messagePayload: {
              id: existing.id ?? messageRef.id,
              conversationId,
              senderId: existing.senderId ?? senderUserId,
              recipientId: existing.recipientId ?? recipientUserId,
              text: existing.text ?? text,
              createdAt: existing.createdAt ?? nowIso,
              isRead: Boolean(existing.isRead),
              status: existing.status ?? "sent",
              clientMessageId: existing.clientMessageId ?? clientMessageId,
              deliveredAt: existing.deliveredAt ?? null,
              seenAt: existing.seenAt ?? null,
            },
          };
        }

        const existingConversation = conversationSnap.exists
          ? (conversationSnap.data() as ConversationDoc | undefined)
          : undefined;

        const recipientUnread = Number(
          existingConversation?.unreadBy?.[recipientUserId] ?? 0,
        );
        unreadCountForRecipient = recipientUnread + 1;

        const participantNames: Record<string, string> = {
          ...(existingConversation?.participantNames ?? {}),
          [senderUserId]: session.user.name ?? "User",
        };

        transaction.set(
          conversationRef,
          {
            id: conversationId,
            listingId,
            listingTitle: listingTitle ?? "",
            itemType: itemType ?? "",
            participants: Array.from(new Set([senderUserId, recipientUserId])),
            participantNames,
            lastMessage: text,
            lastMessageAt: nowIso,
            lastMessageSenderId: senderUserId,
            updatedAt: nowIso,
            createdAt: existingConversation?.createdAt ?? nowIso,
            [`unreadBy.${recipientUserId}`]: FieldValue.increment(1),
            [`unreadBy.${senderUserId}`]: 0,
          },
          { merge: true },
        );

        transaction.set(
          messageRef,
          {
            id: messageRef.id,
            clientMessageId: clientMessageId ?? null,
            conversationId,
            senderId: senderUserId,
            recipientId: recipientUserId,
            text,
            createdAt: nowIso,
            isRead: false,
            status: "sent",
            deliveredAt: null,
            seenAt: null,
          },
          { merge: false },
        );

        transaction.set(
          userRef,
          {
            unreadCount: FieldValue.increment(1),
            lastUpdated: nowIso,
          },
          { merge: true },
        );

        transaction.set(
          adminFirestore.collection("users").doc(senderUserId),
          {
            lastActiveAt: nowIso,
            lastSeenAt: nowIso,
          },
          { merge: true },
        );

        return {
          created: true,
          unreadCountForRecipient,
          messagePayload: {
            id: messageRef.id,
            conversationId,
            senderId: senderUserId,
            recipientId: recipientUserId,
            text,
            createdAt: nowIso,
            isRead: false,
            status: "sent" as const,
            clientMessageId,
            deliveredAt: null,
            seenAt: null,
          },
        };
      },
    );

    const { created, unreadCountForRecipient, messagePayload } = transactionResult;

    if (!messagePayload) {
      throw new Error("Failed to build message payload");
    }

    const receiverIsOnline = await isUserConnected(recipientUserId);
    let pushSent = false;

    if (created && !receiverIsOnline) {
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

    if (created) {
      await publishChatMessageEvent({
        conversationId,
        message: messagePayload,
      });
    }

    return NextResponse.json({
      success: true,
      created,
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
