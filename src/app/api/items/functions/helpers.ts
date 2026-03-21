import { $Enums, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Errors } from "../../lib/errors/errors";
import { BaseItem } from "../type";
import { getFeaturedCutoffDate } from "@/lib/featuredAds";

/* ---------------------------------------------
   Helper: البحث النصي
--------------------------------------------- */
export function buildSearch(model: $Enums.ItemType, q?: string) {
  if (!q) return undefined;

  const text = { contains: q, mode: "insensitive" };

  switch (model) {
    case "NEW_CAR":
    case "USED_CAR":
      return { OR: [{ brand: text }, { model: text }, { description: text }] };
    case "PROPERTY":
      return { OR: [{ title: text }, { description: text }] };
    case "OTHER":
      return { OR: [{ name: text }, { description: text }] };
  }
}

// Helper لتحديد موديل البحث
export function getModel(
  type: $Enums.ItemType,
  client: {
    newCar: typeof prisma.newCar;
    oldCar: typeof prisma.oldCar;
    property: typeof prisma.property;
    otherItem: typeof prisma.otherItem;
  } = prisma,
) {
  switch (type) {
    case $Enums.ItemType.NEW_CAR:
      return client.newCar;
    case $Enums.ItemType.USED_CAR:
      return client.oldCar;
    case $Enums.ItemType.PROPERTY:
      return client.property;
    case $Enums.ItemType.OTHER:
      return client.otherItem;
    default:
      throw new Error("نوع العنصر غير صالح");
  }
}

export async function findItemByType(type: $Enums.ItemType, id: string) {
  switch (type) {
    case $Enums.ItemType.NEW_CAR:
      return prisma.newCar.findFirst({
        where: { id, isDeleted: false },
      });

    case $Enums.ItemType.USED_CAR:
      return prisma.oldCar.findFirst({
        where: { id, isDeleted: false },
      });

    case $Enums.ItemType.PROPERTY:
      return prisma.property.findFirst({
        where: { id, isDeleted: false },
      });

    case $Enums.ItemType.OTHER:
      return prisma.otherItem.findFirst({
        where: { id, isDeleted: false },
      });

    default:
      return null;
  }
}
// soft delete
export async function softDeleteByType(
  tx: unknown,
  type: $Enums.ItemType,
  id: string,
) {
  const client = tx as Prisma.TransactionClient;
  const data = { isDeleted: true, deletedAt: new Date() };

  switch (type) {
    case $Enums.ItemType.NEW_CAR:
      return client.newCar.updateMany({
        where: { id, isDeleted: false },
        data,
      });

    case $Enums.ItemType.USED_CAR:
      return client.oldCar.updateMany({
        where: { id, isDeleted: false },
        data,
      });

    case $Enums.ItemType.PROPERTY:
      return client.property.updateMany({
        where: { id, isDeleted: false },
        data,
      });

    case $Enums.ItemType.OTHER:
      return client.otherItem.updateMany({
        where: { id, isDeleted: false },
        data,
      });
  }
}

// find item by itemType and itemId
export async function getItem(type: $Enums.ItemType, itemId: string) {
  const item = await findItemByType(type, itemId);
  return item;
}

//helper function to find item type and  item location by id
export async function getItemTypeById(itemId: string) {
  const id = await prisma.location.findFirst({
    where: {
      OR: [
        { newCarId: itemId, isDeleted: false },
        { oldCarId: itemId, isDeleted: false },
        { propertyId: itemId, isDeleted: false },
        { otherItemId: itemId, isDeleted: false },
      ],
    },
    select: {
      newCarId: true,
      oldCarId: true,
      propertyId: true,
      otherItemId: true,
    },
  });

  if (!id) {
    throw Errors.NOT_FOUND("العنصر غير موجود");
  }
  const itemType: $Enums.ItemType = id.newCarId
    ? $Enums.ItemType.NEW_CAR
    : id.oldCarId
      ? $Enums.ItemType.USED_CAR
      : id.propertyId
        ? $Enums.ItemType.PROPERTY
        : $Enums.ItemType.OTHER;

  return { itemType };
}

/* ---------------------------------------------
   Helper: جلب الصور والموقع
--------------------------------------------- */
export async function attachExtras(items: BaseItem[]) {
  return Promise.all(
    items.map(async (item) => {
      const images = await prisma.itemImage.findMany({
        where: { itemId: item.id },
        select: { url: true },
      });

      const reviewsCount = await prisma.review.count({
        where: { itemId: item.id },
      });

      const averageRatingAgg = await prisma.review.aggregate({
        where: { itemId: item.id },
        _avg: { rate: true },
      });

      const averageRating =
        averageRatingAgg?._avg?.rate !== null
          ? Number(averageRatingAgg._avg.rate.toFixed(2))
          : null;

      return {
        ...item,
        images,
        reviewsCount,
        averageRating,
        location: item.location ?? null,
      };
    }),
  );
}

export async function attachRelatedById(itemId: string) {
  const [images, reviews, transactions] = await Promise.all([
    prisma.itemImage.findMany({
      where: { itemId },
      select: { url: true },
    }),

    prisma.review.findMany({
      where: { itemId },
    }),

    prisma.transaction.findMany({
      where: { itemId },
    }),
  ]);
  return { images, reviews, transactions };
}

// Optimized batch version: fetch all images and review aggregates in bulk
type BatchItem = {
  id: string;
  location?: unknown | null;
} & Record<string, unknown>;

export async function attachExtrasBatch(items: BatchItem[]) {
  if (!items || items.length === 0) return [];

  const ids = items.map((it) => it.id);
  const featuredCutoff = getFeaturedCutoffDate();

  // Fetch all images for these items in one query
  const images = await prisma.itemImage.findMany({
    where: { itemId: { in: ids } },
    select: { itemId: true, url: true },
  });

  // Aggregate reviews (count + avg) grouped by itemId
  const reviewsAgg = await prisma.review.groupBy({
    by: ["itemId"],
    where: { itemId: { in: ids } },
    _count: { _all: true },
    _avg: { rate: true },
  });

  const featuredPins = await prisma.pinnedItem.findMany({
    where: {
      itemId: { in: ids },
      createdAt: { gte: featuredCutoff },
    },
    select: {
      itemId: true,
      itemType: true,
      createdAt: true,
    },
  });

  const imagesMap = images.reduce<Record<string, { url: string }[]>>(
    (acc, img) => {
      (acc[img.itemId] ||= []).push({ url: img.url });
      return acc;
    },
    {},
  );

  const reviewsMap = reviewsAgg.reduce<
    Record<string, { count: number; avg: number | null }>
  >((acc, r) => {
    acc[r.itemId] = {
      count: r._count?._all ?? 0,
      avg: r._avg?.rate ?? null,
    };
    return acc;
  }, {});

  const featuredMap = featuredPins.reduce<Record<string, Date>>((acc, pin) => {
    const key = `${pin.itemType}:${pin.itemId}`;
    const current = acc[key];
    if (!current || pin.createdAt > current) {
      acc[key] = pin.createdAt;
    }
    return acc;
  }, {});

  const resolveItemType = (item: BatchItem): $Enums.ItemType | null => {
    const directType = item.type;
    if (
      directType === $Enums.ItemType.NEW_CAR ||
      directType === $Enums.ItemType.USED_CAR ||
      directType === $Enums.ItemType.PROPERTY ||
      directType === $Enums.ItemType.OTHER
    ) {
      return directType;
    }

    const categoryType = (item.category as { type?: $Enums.ItemType })?.type;
    if (
      categoryType === $Enums.ItemType.NEW_CAR ||
      categoryType === $Enums.ItemType.USED_CAR ||
      categoryType === $Enums.ItemType.PROPERTY ||
      categoryType === $Enums.ItemType.OTHER
    ) {
      return categoryType;
    }

    return null;
  };

  return items.map((it) => {
    const imgs = imagesMap[it.id] ?? [];
    const rv = reviewsMap[it.id] ?? { count: 0, avg: null };
    const itemType = resolveItemType(it);
    const featuredKey = itemType ? `${itemType}:${it.id}` : "";
    const featuredAt = featuredKey ? featuredMap[featuredKey] : undefined;

    return {
      ...it,
      images: imgs,
      reviewsCount: rv.count,
      averageRating: rv.avg !== null ? parseFloat(rv.avg.toFixed(2)) : null,
      location: it.location ?? null,
      isFeatured: Boolean(featuredAt),
      featuredAt: featuredAt?.toISOString() ?? null,
    };
  });
}

/* ---------------------------------------------
   Helper: توليد فلترة WHERE
--------------------------------------------- */
type BuildWhereRequest = {
  q?: string;
  city?: string;
  country?: string;
  type?: $Enums.ItemType;
  action?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  catName?: string;
};

export async function buildWhere(req: BuildWhereRequest) {
  const { q, city, country, type, action, minPrice, maxPrice, catName } = req;

  const where: Record<string, unknown> = {
    isDeleted: false,
    status: "AVAILABLE",
  };

  // 🔍 البحث النصي
  if (type) {
    const search = buildSearch(type, q);
    if (search) Object.assign(where, search);
  }

  // 📍 الموقع (مدينة + دولة)
  if (city || country) {
    where.location = {
      ...(city && city !== "All"
        ? {
            city: {
              contains: city,
              mode: "insensitive",
            },
          }
        : {}),
      ...(country
        ? {
            country: {
              equals: country,
            },
          }
        : {}),
    };
  }

  // 🏷️ بيع / إيجار
  if (action === "SELL" || action === "Buy") {
    where.sellOrRent = $Enums.TransactionType.SELL;
  }
  if (action === "RENT" || action === "Rent") {
    where.sellOrRent = $Enums.TransactionType.RENT;
  }

  // 💰 السعر
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: Number(minPrice) } : {}),
      ...(maxPrice ? { lte: Number(maxPrice) } : {}),
    };
  }

  // 🗂️ الفئة
  if (catName && catName !== "All") {
    const cat = await prisma.category.findFirst({
      where: { name: catName },
      select: { id: true },
    });

    if (cat) where.categoryId = cat.id;
  }

  return where;
}
