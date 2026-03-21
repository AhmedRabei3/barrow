import { ItemType, Prisma } from "@prisma/client";

const MS_DAY = 24 * 60 * 60 * 1000;
export const FEATURED_AD_MONTHLY_PRICE = 10;
export const FEATURED_AD_DURATION_DAYS = 30;

export const getFeaturedCutoffDate = () =>
  new Date(Date.now() - FEATURED_AD_DURATION_DAYS * MS_DAY);

type FeaturedActivationTxClient = {
  newCar: {
    findFirst: (
      args: Prisma.NewCarFindFirstArgs,
    ) => Promise<{ id: string } | null>;
  };
  oldCar: {
    findFirst: (
      args: Prisma.OldCarFindFirstArgs,
    ) => Promise<{ id: string } | null>;
  };
  property: {
    findFirst: (
      args: Prisma.PropertyFindFirstArgs,
    ) => Promise<{ id: string } | null>;
  };
  otherItem: {
    findFirst: (
      args: Prisma.OtherItemFindFirstArgs,
    ) => Promise<{ id: string } | null>;
  };
  pinnedItem: {
    upsert: (args: Prisma.PinnedItemUpsertArgs) => Promise<unknown>;
  };
  notification: {
    create: (args: Prisma.NotificationCreateArgs) => Promise<unknown>;
  };
};

const ensureOwnedActiveItem = async (
  tx: FeaturedActivationTxClient,
  userId: string,
  itemId: string,
  itemType: ItemType,
) => {
  switch (itemType) {
    case ItemType.NEW_CAR:
      return tx.newCar.findFirst({
        where: { id: itemId, ownerId: userId, isDeleted: false },
        select: { id: true },
      });
    case ItemType.USED_CAR:
      return tx.oldCar.findFirst({
        where: { id: itemId, ownerId: userId, isDeleted: false },
        select: { id: true },
      });
    case ItemType.PROPERTY:
      return tx.property.findFirst({
        where: { id: itemId, ownerId: userId, isDeleted: false },
        select: { id: true },
      });
    case ItemType.OTHER:
      return tx.otherItem.findFirst({
        where: { id: itemId, ownerId: userId, isDeleted: false },
        select: { id: true },
      });
    default:
      return null;
  }
};

export const applyFeaturedAdActivation = async (params: {
  tx: FeaturedActivationTxClient;
  userId: string;
  itemId: string;
  itemType: ItemType;
  sourceLabel: string;
}) => {
  const { tx, userId, itemId, itemType, sourceLabel } = params;

  const item = await ensureOwnedActiveItem(tx, userId, itemId, itemType);
  if (!item) {
    throw new Error("Item not found or not owned by user");
  }

  await tx.pinnedItem.upsert({
    where: {
      userId_itemId_itemType: {
        userId,
        itemId,
        itemType,
      },
    },
    update: {
      createdAt: new Date(),
    },
    create: {
      userId,
      itemId,
      itemType,
    },
  });

  await tx.notification.create({
    data: {
      userId,
      title: "⭐ تم تفعيل الإعلان المميز",
      message: `تم تثبيت إعلانك لمدة ${FEATURED_AD_DURATION_DAYS} يومًا عبر ${sourceLabel}.`,
    },
  });
};
