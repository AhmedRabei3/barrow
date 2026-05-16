/**
 * nearby-notify.service.ts
 *
 * When a new listing is published, this service finds users who have
 * previously listed items within NEARBY_RADIUS_KM of the new item and
 * sends each of them an in-app notification suggesting the new listing.
 *
 * Strategy: query ListingSearchIndex (denormalised, has lat/lng) with
 * a Haversine formula using PostgreSQL raw SQL, then bulk-insert
 * notifications via createMany.
 */

import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ─── Constants ───────────────────────────────────────────────────────────────

const NEARBY_RADIUS_KM = 5;
const MAX_RECIPIENTS = 200;

// ─── Types ───────────────────────────────────────────────────────────────────

type SupportedItemType =
  | "NEW_CAR"
  | "USED_CAR"
  | "PROPERTY"
  | "HOME_FURNITURE"
  | "MEDICAL_DEVICE"
  | "OTHER";

type NearbyNotifyParams = {
  /** ID of the user who created the item (excluded from recipients). */
  ownerId: string;
  /** Latitude of the new listing. */
  lat: number;
  /** Longitude of the new listing. */
  lng: number;
  /** Item type — used to build a human-readable label. */
  itemType: SupportedItemType;
  /** Display title / name of the new listing. */
  title: string;
  /**
   * Language resolved from the request session cookie (barrow-locale).
   * true = Arabic, false / undefined = English (default).
   */
  isArabic?: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Find users who have posted items within NEARBY_RADIUS_KM of the new listing
 * and send each of them an in-app notification.
 *
 * Uses a Haversine formula via raw SQL on the ListingSearchIndex table.
 * The function is intentionally fire-and-forget safe — all errors are
 * caught internally.
 */
export async function notifyNearbyUsers({
  ownerId,
  lat,
  lng,
  itemType,
  title,
  isArabic = false,
}: NearbyNotifyParams): Promise<void> {
  // ── 1. Find nearby owner IDs via Haversine ──────────────────────────────
  type Row = { ownerId: string };

  const nearbyRows = await prisma.$queryRaw<Row[]>`
    SELECT DISTINCT "ownerId"
    FROM "ListingSearchIndex"
    WHERE
      "isDeleted" = false
      AND "locationLat" IS NOT NULL
      AND "locationLng" IS NOT NULL
      AND "ownerId" != ${ownerId}
      AND (
        6371.0 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${lat})) * cos(radians("locationLat"))
            * cos(radians("locationLng") - radians(${lng}))
            + sin(radians(${lat})) * sin(radians("locationLat"))
          ))
        )
      ) <= ${NEARBY_RADIUS_KM}
    LIMIT ${MAX_RECIPIENTS}
  `;

  if (nearbyRows.length === 0) return;

  const candidateIds = nearbyRows.map((r) => r.ownerId);

  // ── 2. Verify users are not soft-deleted ────────────────────────────────
  const activeUsers = await prisma.user.findMany({
    where: { id: { in: candidateIds }, isDeleted: false },
    select: { id: true },
  });

  if (activeUsers.length === 0) return;

  // ── 3. Build notification content based on session language ──────────────
  const labels = itemTypeLabels(itemType);
  const safeTitle = title.slice(0, 100);

  const notifTitle = isArabic
    ? `🔔 ${labels.ar} جديد بالقرب منك`
    : `🔔 New ${labels.en} nearby`;

  const notifMessage = isArabic
    ? `تمّ إضافة "${safeTitle}" على بعد ${NEARBY_RADIUS_KM} كم منك — اكتشفه الآن!`
    : `"${safeTitle}" was listed within ${NEARBY_RADIUS_KM} km of you — check it out!`;

  // ── 4. Bulk-insert notifications ────────────────────────────────────────
  await prisma.notification.createMany({
    data: activeUsers.map((u) => ({
      userId: u.id,
      title: notifTitle,
      message: notifMessage,
      type: NotificationType.INFO,
    })),
    skipDuplicates: true,
  });

  logger.info(
    `[nearby-notify] Sent nearby notification for "${safeTitle}" (${itemType}) to ${activeUsers.length} user(s) within ${NEARBY_RADIUS_KM} km.`,
  );
}

// ─── Fire-and-forget wrapper ──────────────────────────────────────────────────

/**
 * Fire-and-forget version of notifyNearbyUsers.
 * Safe to call without awaiting — errors are caught and logged.
 */
export function notifyNearbyUsersAsync(params: NearbyNotifyParams): void {
  void notifyNearbyUsers(params).catch((err) =>
    logger.warn("[nearby-notify] Non-critical failure:", err),
  );
}
