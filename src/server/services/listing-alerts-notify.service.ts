import { NotificationType, Prisma, type TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { buildListingDetailsPath } from "@/lib/listingSeo";
import { sendListingAlertPushNotification } from "@/server/firebase/listing-alert-push";

type SupportedItemType =
  | "NEW_CAR"
  | "USED_CAR"
  | "PROPERTY"
  | "HOME_FURNITURE"
  | "MEDICAL_DEVICE"
  | "OTHER";

type NotifyListingAlertSubscribersParams = {
  ownerId: string;
  itemId: string;
  lat: number;
  lng: number;
  itemType: SupportedItemType;
  title: string;
  categoryId?: string | null;
  sellOrRent?: TransactionType | null;
  isArabic?: boolean;
};

const MAX_ALERT_RECIPIENTS = 300;

function itemTypeLabels(itemType: SupportedItemType): {
  ar: string;
  en: string;
} {
  const map: Record<SupportedItemType, { ar: string; en: string }> = {
    NEW_CAR: { ar: "سيارة جديدة", en: "new car" },
    USED_CAR: { ar: "سيارة مستعملة", en: "used car" },
    PROPERTY: { ar: "عقار", en: "property" },
    HOME_FURNITURE: { ar: "أثاث منزلي", en: "home furniture" },
    MEDICAL_DEVICE: { ar: "جهاز طبي", en: "medical device" },
    OTHER: { ar: "منتج", en: "listing" },
  };

  return map[itemType];
}

export async function notifyListingAlertSubscribers({
  ownerId,
  itemId,
  lat,
  lng,
  itemType,
  title,
  categoryId,
  sellOrRent,
  isArabic = false,
}: NotifyListingAlertSubscribersParams): Promise<void> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  const categoryCondition = categoryId
    ? Prisma.sql`AND (a."categoryId" IS NULL OR a."categoryId" = ${categoryId})`
    : Prisma.sql`AND a."categoryId" IS NULL`;

  const actionCondition = sellOrRent
    ? Prisma.sql`AND (a."sellOrRent" IS NULL OR a."sellOrRent" = ${sellOrRent}::"TransactionType")`
    : Prisma.sql`AND a."sellOrRent" IS NULL`;

  type AlertRow = { id: string; userId: string };
  const matchedAlerts = await prisma.$queryRaw<AlertRow[]>(Prisma.sql`
    SELECT a."id", a."userId"
    FROM "ListingAvailabilityAlert" a
    WHERE
      a."isEnabled" = true
      AND a."userId" != ${ownerId}
      AND (a."itemType" IS NULL OR a."itemType" = ${itemType}::"ItemType")
      ${categoryCondition}
      ${actionCondition}
      AND (
        6371.0 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${lat})) * cos(radians(a."centerLat"))
            * cos(radians(a."centerLng") - radians(${lng}))
            + sin(radians(${lat})) * sin(radians(a."centerLat"))
          ))
        )
      ) <= a."radiusKm"
    LIMIT ${MAX_ALERT_RECIPIENTS}
  `);

  if (matchedAlerts.length === 0) {
    return;
  }

  const uniqueRecipientIds = Array.from(
    new Set(matchedAlerts.map((alert) => alert.userId)),
  );

  const activeUsers = await prisma.user.findMany({
    where: {
      id: { in: uniqueRecipientIds },
      isDeleted: false,
    },
    select: { id: true },
  });

  if (activeUsers.length === 0) {
    return;
  }

  const labels = itemTypeLabels(itemType);
  const safeTitle = title.slice(0, 110);
  const notifTitle = isArabic
    ? `🔔 ${labels.ar} جديد ضمن نطاق تنبيهك`
    : `🔔 New ${labels.en} in your alert area`;

  const notifMessage = isArabic
    ? `تمت إضافة "${safeTitle}" ضمن الموقع والمسافة التي حددتها مسبقاً.`
    : `"${safeTitle}" was posted within your saved location radius.`;

  const listingUrl = buildListingDetailsPath({
    id: itemId,
    title: safeTitle,
  });

  await Promise.all(
    activeUsers.map(async (user) => {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: notifTitle,
          message: notifMessage,
          type: NotificationType.INFO,
        },
      });

      await sendListingAlertPushNotification({
        recipientUserId: user.id,
        title: notifTitle,
        body: notifMessage,
        url: listingUrl,
      });
    }),
  );

  await prisma.listingAvailabilityAlert.updateMany({
    where: {
      id: {
        in: matchedAlerts.map((alert) => alert.id),
      },
    },
    data: {
      lastMatchAt: new Date(),
    },
  });

  logger.info(
    `[listing-alerts] Sent ${activeUsers.length} notification(s) for item "${safeTitle}" (${itemType}).`,
  );
}

export function notifyListingAlertSubscribersAsync(
  params: NotifyListingAlertSubscribersParams,
): void {
  void notifyListingAlertSubscribers(params).catch((err) => {
    logger.warn("[listing-alerts] Non-critical failure:", err);
  });
}
