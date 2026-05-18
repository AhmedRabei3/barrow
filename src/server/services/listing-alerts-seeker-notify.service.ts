import {
  NotificationType,
  Prisma,
  type ItemType,
  type TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendListingAlertPushNotification } from "@/server/firebase/listing-alert-push";
import { sendNotificationToUser } from "@/lib/websocketServer";

const MAX_RECIPIENTS = 250;
const MAX_RADIUS_KM = 50;

const itemTypeLabels: Record<ItemType, { ar: string; en: string }> = {
  PROPERTY: { ar: "عقار", en: "property" },
  NEW_CAR: { ar: "سيارة جديدة", en: "new car" },
  USED_CAR: { ar: "سيارة مستعملة", en: "used car" },
  HOME_FURNITURE: { ar: "أثاث منزلي", en: "home furniture" },
  MEDICAL_DEVICE: { ar: "جهاز طبي", en: "medical device" },
  OTHER: { ar: "عنصر", en: "listing" },
};

type NotifyNearbySeekersParams = {
  alertId: string;
  seekerUserId: string;
  seekerName?: string | null;
  lat: number;
  lng: number;
  radiusKm: number;
  itemType: ItemType | null;
  action: TransactionType | null;
  categoryId?: string | null;
  categoryName?: string | null;
  isArabic?: boolean;
};

function buildSeekerAlertToken(input: {
  alertId: string;
  seekerUserId: string;
  chatListingId: string;
  itemType: ItemType | "OTHER";
}) {
  return `SEEKER_ALERT:${input.alertId}:${input.seekerUserId}:${input.chatListingId}:${input.itemType}`;
}

function buildChatListingId(alertId: string) {
  return `seek_${alertId}`;
}

function buildChatTitle(input: {
  itemType: ItemType | null;
  action: TransactionType | null;
  categoryName?: string | null;
  isArabic: boolean;
}) {
  const itemLabel = input.itemType
    ? itemTypeLabels[input.itemType]
    : { ar: "عرض", en: "offer" };

  const actionLabel = input.action
    ? input.action === "RENT"
      ? { ar: "للإيجار", en: "for rent" }
      : { ar: "للبيع", en: "for sale" }
    : { ar: "", en: "" };

  if (input.isArabic) {
    const categoryPart = input.categoryName ? ` (${input.categoryName})` : "";
    const actionPart = actionLabel.ar ? ` ${actionLabel.ar}` : "";
    return `طلب قريب: ${itemLabel.ar}${actionPart}${categoryPart}`;
  }

  const categoryPart = input.categoryName ? ` (${input.categoryName})` : "";
  const actionPart = actionLabel.en ? ` ${actionLabel.en}` : "";
  return `Nearby request: ${itemLabel.en}${actionPart}${categoryPart}`;
}

export async function notifyNearbyUsersAboutSeekerAlert({
  alertId,
  seekerUserId,
  seekerName,
  lat,
  lng,
  radiusKm,
  itemType,
  action,
  categoryId,
  categoryName,
  isArabic = false,
}: NotifyNearbySeekersParams): Promise<void> {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(radiusKm)
  ) {
    return;
  }

  const effectiveRadius = Math.max(1, Math.min(MAX_RADIUS_KM, radiusKm));

  const typeCondition = itemType
    ? Prisma.sql`AND (idx."itemType" = ${itemType}::"ItemType")`
    : Prisma.sql``;
  const actionCondition = action
    ? Prisma.sql`AND idx."sellOrRent" = ${action}::"TransactionType"`
    : Prisma.sql``;
  const categoryCondition = categoryId
    ? Prisma.sql`AND idx."categoryId" = ${categoryId}`
    : Prisma.sql``;

  type RecipientRow = { ownerId: string };
  const rows = await prisma.$queryRaw<RecipientRow[]>(Prisma.sql`
    SELECT DISTINCT idx."ownerId"
    FROM "ListingSearchIndex" idx
    WHERE
      idx."isDeleted" = false
      AND idx."status" = 'AVAILABLE'::"Availability"
      AND idx."locationLat" IS NOT NULL
      AND idx."locationLng" IS NOT NULL
      AND idx."ownerId" != ${seekerUserId}
      ${typeCondition}
      ${actionCondition}
      ${categoryCondition}
      AND (
        6371.0 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${lat})) * cos(radians(idx."locationLat"))
            * cos(radians(idx."locationLng") - radians(${lng}))
            + sin(radians(${lat})) * sin(radians(idx."locationLat"))
          ))
        )
      ) <= ${effectiveRadius}
    LIMIT ${MAX_RECIPIENTS}
  `);

  if (rows.length === 0) {
    return;
  }

  const recipientIds = Array.from(new Set(rows.map((row) => row.ownerId)));
  const activeUsers = await prisma.user.findMany({
    where: {
      id: { in: recipientIds },
      isDeleted: false,
    },
    select: { id: true },
  });

  if (activeUsers.length === 0) {
    return;
  }

  const effectiveItemType: ItemType | "OTHER" = itemType ?? "OTHER";
  const itemLabel = itemType
    ? itemTypeLabels[itemType]
    : { ar: "عنصر", en: "listing" };
  const chatListingId = buildChatListingId(alertId);
  const chatTitle = buildChatTitle({
    itemType,
    action,
    categoryName,
    isArabic,
  });
  const requesterName = seekerName?.trim() || (isArabic ? "مستخدم" : "A user");

  const notificationTitle = isArabic
    ? `📣 ${requesterName} يبحث عن ${itemLabel.ar} قربك`
    : `📣 ${requesterName} is looking for a ${itemLabel.en} near you`;

  const notificationBody = isArabic
    ? "هناك مستخدم يبحث عن عرض قريب من منطقتك. يمكنك مراسلته مباشرة من هذا الإشعار."
    : "A user is looking for a nearby offer in your area. You can message them directly from this notification.";

  const notificationMessage = `${notificationBody}\n${buildSeekerAlertToken({
    alertId,
    seekerUserId,
    chatListingId,
    itemType: effectiveItemType,
  })}`;

  const chatUrl = `/messages?ownerId=${encodeURIComponent(seekerUserId)}&listingId=${encodeURIComponent(chatListingId)}&title=${encodeURIComponent(chatTitle)}&itemType=${encodeURIComponent(effectiveItemType)}`;

  await Promise.all(
    activeUsers.map(async (user) => {
      const unreadCount = await prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      });

      const createdNotification = await prisma.notification.create({
        data: {
          userId: user.id,
          title: notificationTitle,
          message: notificationMessage,
          type: NotificationType.INFO,
        },
      });

      sendNotificationToUser(user.id, {
        id: createdNotification.id,
        title: createdNotification.title,
        message: createdNotification.message,
        type: createdNotification.type ?? NotificationType.INFO,
        createdAt: createdNotification.createdAt.toISOString(),
        isRead: createdNotification.isRead,
      });

      await sendListingAlertPushNotification({
        recipientUserId: user.id,
        title: notificationTitle,
        body: notificationBody,
        url: chatUrl,
        unreadCount: unreadCount + 1,
      });
    }),
  );

  logger.info(
    `[listing-alerts-seeker] Sent ${activeUsers.length} nearby seeker notification(s) for alert ${alertId}.`,
  );
}

export function notifyNearbyUsersAboutSeekerAlertAsync(
  params: NotifyNearbySeekersParams,
): void {
  void notifyNearbyUsersAboutSeekerAlert(params).catch((error) => {
    logger.warn("[listing-alerts-seeker] Non-critical failure:", error);
  });
}
