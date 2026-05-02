// src/app/api/chat/messages/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import {
  adminFirestore,
  firebaseAdminSetupHint,
  isFirebaseAdminConfigured,
} from "@/server/firebase/admin";
import { sendChatPushNotification } from "@/server/firebase/push";
import { buildChatConversationId } from "@/lib/chatConversation";
import { isUserConnected } from "@/lib/websocketServer";
import { logger } from "@/lib/logger";

const sendMessageSchema = z.object({
  recipientUserId: z.string().min(1),
  listingId: z.string().min(1),
  listingTitle: z.string().trim().optional(),
  itemType: z.string().trim().optional(),
  text: z.string().trim().min(1).max(2000),
});

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json(
      { message: firebaseAdminSetupHint },
      { status: 503 }
    );
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const conversationId =
      req.nextUrl.searchParams.get("conversationId") || "";

    if (!conversationId) {
      return NextResponse.json(
        { message: "conversationId is required" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    const conversationRef = adminFirestore
      .collection("conversations")
      .doc(conversationId);

    const conversationSnap = await conversationRef.get();

    if (!conversationSnap.exists) {
      return NextResponse.json({ messages: [] });
    }

    const conversationData = conversationSnap.data() as
      | { participants?: string[] }
      | undefined;

    if (!conversationData?.participants?.includes(userId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const messagesSnap = await conversationRef
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limit(500)
      .get();

    const messages = messagesSnap.docs.map((docSnap) => {
      const data = docSnap.data() as {
        senderId?: string;
        recipientId?: string;
        text?: string;
        createdAt?: string;
        isRead?: boolean;
      };

      return {
        id: docSnap.id,
        senderId: data.senderId ?? "",
        recipientId: data.recipientId ?? "",
        text: data.text ?? "",
        createdAt: data.createdAt ?? "",
        isRead: data.isRead ?? false,
      };
    });

    return NextResponse.json({ messages });
  } catch (error) {
    logger.error("Failed to load chat messages", error);
    return NextResponse.json(
      { message: "Failed to load messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json(
      { message: firebaseAdminSetupHint },
      { status: 503 }
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
        { status: 400 }
      );
    }

    const {
      recipientUserId,
      listingId,
      listingTitle,
      itemType,
      text,
    } = parsed.data;

    const senderUserId = session.user.id;

    if (recipientUserId === senderUserId) {
      return NextResponse.json(
        { message: "You cannot start a chat with yourself" },
        { status: 400 }
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

    const messageRef = conversationRef.collection("messages").doc();

    let unreadCountForRecipient = 1;

    // 🔥 Transaction (conversation + message + unreadBy)
    await adminFirestore.runTransaction(async (transaction) => {
      const conversationSnap = await transaction.get(conversationRef);

      const existing = conversationSnap.exists
        ? (conversationSnap.data() as
            | {
                createdAt?: string;
                unreadBy?: Record<string, number>;
                participantNames?: Record<string, string>;
              }
            | undefined)
        : undefined;

      const nextParticipantNames: Record<string, string> = {
        ...(existing?.participantNames ?? {}),
        [senderUserId]: session.user.name ?? "User",
      };

      const recipientUnread = Number(
        existing?.unreadBy?.[recipientUserId] ?? 0
      );

      unreadCountForRecipient = recipientUnread + 1;

      transaction.set(
        conversationRef,
        {
          id: conversationId,
          listingId,
          listingTitle: listingTitle ?? "",
          itemType: itemType ?? "",
          participants: Array.from(
            new Set([senderUserId, recipientUserId])
          ),
          participantNames: nextParticipantNames,
          lastMessage: text,
          lastMessageAt: nowIso,
          lastMessageSenderId: senderUserId,
          updatedAt: nowIso,
          createdAt: existing?.createdAt ?? nowIso,

          [`unreadBy.${recipientUserId}`]:
            FieldValue.increment(1),

          [`unreadBy.${senderUserId}`]: 0,
        },
        { merge: true }
      );

      transaction.set(messageRef, {
        id: messageRef.id,
        conversationId,
        senderId: senderUserId,
        recipientId: recipientUserId,
        text,
        createdAt: nowIso,
        isRead: false,
      });
    });

    // 🔥 NEW: Global unread counter (USER LEVEL)
    await adminFirestore
      .collection("users")
      .doc(recipientUserId)
      .set(
        {
          unreadCount: FieldValue.increment(1),
          lastUpdated: nowIso,
        },
        { merge: true }
      );

    const receiverIsOnline = isUserConnected(recipientUserId);

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

    return NextResponse.json({
      success: true,
      conversationId,
      messageId: messageRef.id,
      pushSent,
      receiverIsOnline,
    });
  } catch (error) {
    logger.error("Failed to send chat message", error);
    return NextResponse.json(
      { message: "Failed to send message" },
      { status: 500 }
    );
  }
}