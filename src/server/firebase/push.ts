import { adminMessaging } from "@/server/firebase/admin";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

type ChatPushInput = {
  recipientUserId: string;
  senderName: string;
  listingTitle: string;
  previewText: string;
  conversationId: string;
  unreadCount?: number;
};

const getUserFcmTokens = async (userId: string): Promise<string[]> => {
  const rows = await prisma.userFcmToken.findMany({
    where: { userId },
    select: { token: true },
  });
  return rows.map((r) => r.token);
};

export const sendChatPushNotification = async ({
  recipientUserId,
  senderName,
  listingTitle,
  previewText,
  conversationId,
  unreadCount,
}: ChatPushInput) => {
  const tokens = await getUserFcmTokens(recipientUserId);
  if (tokens.length === 0) {
    return { sent: false, reason: "no_tokens" as const };
  }

  const badgeCount = Math.max(1, unreadCount ?? 1);

  const notificationBody =
    unreadCount && unreadCount > 1
      ? `You have ${unreadCount} unread messages`
      : listingTitle
        ? `${listingTitle}: ${previewText}`
        : previewText;

  const response = await adminMessaging.sendEachForMulticast({
    tokens,
    notification: {
      title: `New message from ${senderName}`,
      body: notificationBody,
    },
    data: {
      type: "chat_message",
      conversationId,
      unreadCount: String(badgeCount),
      markReadUrl: `/api/chat/messages/read`,
    },
    // ── Android badge + notification ──
    android: {
      notification: {
        notificationCount: badgeCount,
        sound: "default",
        channelId: "chat_messages",
        priority: "high",
      },
    },
    // ── iOS (APNs) badge ──
    apns: {
      payload: {
        aps: {
          badge: badgeCount,
          sound: "default",
        },
      },
    },
    // ── Web push ──
    webpush: {
      headers: { Urgency: "high" },
      fcmOptions: {
        link: `/messages?conversationId=${encodeURIComponent(conversationId)}`,
      },
      notification: {
        icon: "/images/logo.png",
        badge: "/images/logo.png",
      },
    },
  });

  // Remove invalid tokens from the database.
  const invalidTokens: string[] = [];
  response.responses.forEach((result, index) => {
    if (
      !result.success &&
      (result.error?.code === "messaging/registration-token-not-registered" ||
        result.error?.code === "messaging/invalid-registration-token")
    ) {
      invalidTokens.push(tokens[index]!);
    }
  });

  if (invalidTokens.length > 0) {
    try {
      await prisma.userFcmToken.deleteMany({
        where: { userId: recipientUserId, token: { in: invalidTokens } },
      });
    } catch (cleanupError) {
      logger.warn("Failed to cleanup invalid FCM tokens", cleanupError);
    }
  }

  return {
    sent: response.successCount > 0,
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
};
