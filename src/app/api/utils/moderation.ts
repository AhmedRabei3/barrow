import { ItemType, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaClientLike = typeof prisma;

export const pendingReviewData = {
  status: "PENDING_REVIEW" as const,
  moderationAction: null,
  moderationNote: null,
  moderatedAt: null,
  moderatedById: null,
};

export const resetItemModeration = async (
  client: PrismaClientLike,
  itemType: ItemType,
  itemId: string,
) => {
  switch (itemType) {
    case ItemType.PROPERTY:
      return client.property.update({
        where: { id: itemId },
        data: pendingReviewData,
      });
    case ItemType.NEW_CAR:
      return client.newCar.update({
        where: { id: itemId },
        data: pendingReviewData,
      });
    case ItemType.USED_CAR:
      return client.oldCar.update({
        where: { id: itemId },
        data: pendingReviewData,
      });
    case ItemType.HOME_FURNITURE:
      return client.homeFurniture.update({
        where: { id: itemId },
        data: pendingReviewData,
      });
    case ItemType.MEDICAL_DEVICE:
      return client.medicalDevice.update({
        where: { id: itemId },
        data: pendingReviewData,
      });
    case ItemType.OTHER:
      return client.otherItem.update({
        where: { id: itemId },
        data: pendingReviewData,
      });
  }
};

const buildModerationItemSnapshot = async (
  itemType: ItemType,
  itemId: string,
) => {
  switch (itemType) {
    case ItemType.PROPERTY: {
      const item = await prisma.property.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          title: true,
          owner: { select: { id: true, name: true } },
        },
      });
      return item
        ? {
            itemId: item.id,
            title: item.title,
            ownerId: item.owner.id,
            ownerName: item.owner.name,
          }
        : null;
    }
    case ItemType.NEW_CAR: {
      const item = await prisma.newCar.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          owner: { select: { id: true, name: true } },
        },
      });
      return item
        ? {
            itemId: item.id,
            title: `${item.brand} ${item.model} ${item.year}`,
            ownerId: item.owner.id,
            ownerName: item.owner.name,
          }
        : null;
    }
    case ItemType.USED_CAR: {
      const item = await prisma.oldCar.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          owner: { select: { id: true, name: true } },
        },
      });
      return item
        ? {
            itemId: item.id,
            title: `${item.brand} ${item.model} ${item.year}`,
            ownerId: item.owner.id,
            ownerName: item.owner.name,
          }
        : null;
    }
    case ItemType.OTHER: {
      const item = await prisma.otherItem.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          name: true,
          owner: { select: { id: true, name: true } },
        },
      });
      return item
        ? {
            itemId: item.id,
            title: item.name,
            ownerId: item.owner.id,
            ownerName: item.owner.name,
          }
        : null;
    }
    case ItemType.HOME_FURNITURE: {
      const item = await prisma.homeFurniture.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          name: true,
          owner: { select: { id: true, name: true } },
        },
      });
      return item
        ? {
            itemId: item.id,
            title: item.name,
            ownerId: item.owner.id,
            ownerName: item.owner.name,
          }
        : null;
    }
    case ItemType.MEDICAL_DEVICE: {
      const item = await prisma.medicalDevice.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          name: true,
          owner: { select: { id: true, name: true } },
        },
      });
      return item
        ? {
            itemId: item.id,
            title: item.name,
            ownerId: item.owner.id,
            ownerName: item.owner.name,
          }
        : null;
    }
  }
};

const buildModerationNotificationMessage = (
  itemType: ItemType,
  itemId: string,
  itemTitle: string,
  ownerName: string,
  reason: "CREATED" | "UPDATED" | "IMAGES_UPDATED",
  isArabic: boolean,
) => {
  const deepLinkToken = `ITEM_MODERATION:${itemType}:${itemId}`;
  const reasonText =
    reason === "CREATED"
      ? isArabic
        ? "تم إرسال عنصر جديد للمراجعة"
        : "A new listing was submitted for review"
      : reason === "IMAGES_UPDATED"
        ? isArabic
          ? "تم تحديث الصور وإعادة الإرسال للمراجعة"
          : "Listing images were updated and resubmitted for review"
        : isArabic
          ? "تم تحديث العنصر وإعادة الإرسال للمراجعة"
          : "A listing was updated and resubmitted for review";

  return isArabic
    ? `${reasonText}\nالعنصر: ${itemTitle}\nالمالك: ${ownerName}\n${deepLinkToken}`
    : `${reasonText}\nItem: ${itemTitle}\nOwner: ${ownerName}\n${deepLinkToken}`;
};

export const notifyAdminsOfModerationQueue = async (
  itemType: ItemType,
  itemId: string,
  reason: "CREATED" | "UPDATED" | "IMAGES_UPDATED",
  isArabic = true,
) => {
  const [snapshot, admins] = await Promise.all([
    buildModerationItemSnapshot(itemType, itemId),
    prisma.user.findMany({
      where: { isAdmin: true, isDeleted: false },
      select: { id: true },
    }),
  ]);

  if (!snapshot || admins.length === 0) {
    return;
  }

  const title = isArabic
    ? "🛡️ عنصر جديد بانتظار المراجعة"
    : "🛡️ Listing waiting for review";
  const message = buildModerationNotificationMessage(
    itemType,
    itemId,
    snapshot.title,
    snapshot.ownerName,
    reason,
    isArabic,
  );

  await Promise.all(
    admins.map((admin) =>
      prisma.notification.create({
        data: {
          userId: admin.id,
          title,
          message,
          type: NotificationType.WARNING,
        },
      }),
    ),
  );
};
