import { adminFirestore, adminMessaging } from "@/server/firebase/admin";
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
  const userDoc = await adminFirestore.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    return [];
  }

  const data = userDoc.data() as
    | { fcmToken?: unknown; fcmTokens?: unknown }
    | undefined;

  const singleToken =
    typeof data?.fcmToken === "string" && data.fcmToken.trim().length > 0
      ? [data.fcmToken.trim()]
      : [];

  const multiTokens = Array.isArray(data?.fcmTokens)
    ? data!.fcmTokens
        .filter((token): token is string => typeof token === "string")
        .map((token) => token.trim())
        .filter(Boolean)
    : [];

  return Array.from(new Set([...singleToken, ...multiTokens]));
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

  const response = await adminMessaging.sendEachForMulticast({
    tokens,
    notification: {
      title: `New message from ${senderName}`,
      body:
        unreadCount && unreadCount > 1
          ? `You have ${unreadCount} unread messages`
          : listingTitle
            ? `${listingTitle}: ${previewText}`
            : previewText,
    },
    data: {
      type: "chat_message",
      conversationId,
      unreadCount: String(unreadCount ?? 1),
      markReadUrl: `/api/chat/messages/read`,
    },
    webpush: {
      fcmOptions: {
        link: `/messages?conversationId=${encodeURIComponent(conversationId)}`,
      },
      notification: {
        icon: "/images/logo.png",
        badge: "/images/logo.png",
      },
    },
  });

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
      const userRef = adminFirestore.collection("users").doc(recipientUserId);
      const docSnap = await userRef.get();
      const data = docSnap.data() as
        | { fcmToken?: unknown; fcmTokens?: unknown }
        | undefined;

      const nextTokens = Array.isArray(data?.fcmTokens)
        ? data!.fcmTokens
            .filter((token): token is string => typeof token === "string")
            .filter((token) => !invalidTokens.includes(token))
        : [];

      const updatePayload: Record<string, unknown> = { fcmTokens: nextTokens };

      if (
        typeof data?.fcmToken === "string" &&
        invalidTokens.includes(data.fcmToken)
      ) {
        updatePayload.fcmToken = null;
      }

      await userRef.set(updatePayload, { merge: true });
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
