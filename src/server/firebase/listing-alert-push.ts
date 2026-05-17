import {
  adminMessaging,
  isFirebaseAdminConfigured,
} from "@/server/firebase/admin";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type ListingAlertPushInput = {
  recipientUserId: string;
  title: string;
  body: string;
  url: string;
};

const getUserFcmTokens = async (userId: string): Promise<string[]> => {
  const rows = await prisma.userFcmToken.findMany({
    where: { userId },
    select: { token: true },
  });

  return rows.map((row) => row.token);
};

export async function sendListingAlertPushNotification({
  recipientUserId,
  title,
  body,
  url,
}: ListingAlertPushInput) {
  if (!isFirebaseAdminConfigured) {
    return { sent: false, reason: "firebase_not_configured" as const };
  }

  const tokens = await getUserFcmTokens(recipientUserId);
  if (tokens.length === 0) {
    return { sent: false, reason: "no_tokens" as const };
  }

  const response = await adminMessaging.sendEachForMulticast({
    tokens,
    notification: {
      title,
      body,
    },
    data: {
      type: "listing_alert",
      url,
    },
    webpush: {
      headers: { Urgency: "high" },
      fcmOptions: { link: url },
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
        "Failed to cleanup invalid listing alert tokens",
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
