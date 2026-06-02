import {
  adminMessaging,
  isFirebaseAdminConfigured,
} from "@/server/firebase/admin";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type PurchaseRequestPushInput = {
  recipientUserId: string;
  title: string;
  body: string;
  webUrl?: string;
  mobileUrl?: string;
  unreadCount?: number;
};

const getUserFcmTokens = async (userId: string): Promise<string[]> => {
  const rows = await prisma.userFcmToken.findMany({
    where: { userId },
    select: { token: true },
  });

  return rows.map((row) => row.token);
};

export async function sendPurchaseRequestStatusPushNotification({
  recipientUserId,
  title,
  body,
  webUrl,
  mobileUrl,
  unreadCount,
}: PurchaseRequestPushInput) {
  if (!isFirebaseAdminConfigured) {
    return { sent: false, reason: "firebase_not_configured" as const };
  }

  const tokens = await getUserFcmTokens(recipientUserId);
  if (tokens.length === 0) {
    return { sent: false, reason: "no_tokens" as const };
  }

  const badgeCount = Math.max(1, unreadCount ?? 1);
  const fallbackUrl = webUrl || mobileUrl || "/notifications";

  const response = await adminMessaging.sendEachForMulticast({
    tokens,
    notification: {
      title,
      body,
    },
    data: {
      type: "purchase_request_status",
      url: fallbackUrl,
      mobileUrl: mobileUrl || "/(app)/my-requests",
      unreadCount: String(badgeCount),
    },
    android: {
      notification: {
        notificationCount: badgeCount,
        sound: "default",
        priority: "high",
      },
    },
    apns: {
      payload: {
        aps: {
          badge: badgeCount,
          sound: "default",
        },
      },
    },
    webpush: {
      headers: { Urgency: "high" },
      fcmOptions: { link: fallbackUrl },
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
      await prisma.userFcmToken.deleteMany({
        where: { userId: recipientUserId, token: { in: invalidTokens } },
      });
    } catch (cleanupError) {
      logger.warn(
        "Failed to cleanup invalid purchase status notification tokens",
        cleanupError,
      );
    }
  }

  return {
    sent: response.successCount > 0,
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
}
