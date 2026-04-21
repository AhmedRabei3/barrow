import { $Enums, Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import type { ItemSearchItemDto } from "@/features/items/types";
import { getFeaturedCutoffDate } from "@/lib/featuredAds";
import { prisma } from "@/lib/prisma";

type ItemWhereInput = Record<string, unknown>;

const defaultOrderBy = [
  { createdAt: "desc" as const },
  { id: "desc" as const },
];

const locationSelect = {
  latitude: true,
  longitude: true,
  address: true,
  city: true,
  country: true,
} as const;

const categorySelect = {
  id: true,
  name: true,
  type: true,
} as const;

const propertySelect = {
  id: true,
  title: true,
  description: true,
  price: true,
  sellOrRent: true,
  rentType: true,
  status: true,
  guests: true,
  bedrooms: true,
  bathrooms: true,
  livingrooms: true,
  kitchens: true,
  area: true,
  floor: true,
  elvator: true,
  petAllowed: true,
  furnished: true,
  createdAt: true,
  location: { select: locationSelect },
  category: { select: categorySelect },
} satisfies Prisma.PropertySelect;

const newCarSelect = {
  id: true,
  brand: true,
  model: true,
  year: true,
  price: true,
  sellOrRent: true,
  rentType: true,
  status: true,
  color: true,
  fuelType: true,
  gearType: true,
  description: true,
  createdAt: true,
  location: { select: locationSelect },
  category: { select: categorySelect },
} satisfies Prisma.NewCarSelect;

const oldCarSelect = {
  id: true,
  brand: true,
  model: true,
  year: true,
  price: true,
  sellOrRent: true,
  rentType: true,
  status: true,
  color: true,
  fuelType: true,
  gearType: true,
  description: true,
  mileage: true,
  reAssembled: true,
  repainted: true,
  createdAt: true,
  location: { select: locationSelect },
  category: { select: categorySelect },
} satisfies Prisma.OldCarSelect;

const otherItemSelect = {
  id: true,
  name: true,
  brand: true,
  description: true,
  price: true,
  sellOrRent: true,
  rentType: true,
  status: true,
  createdAt: true,
  location: { select: locationSelect },
  category: { select: categorySelect },
} satisfies Prisma.OtherItemSelect;

const getCachedCategoryIdByName = unstable_cache(
  async (name: string) => {
    const needle = name.trim();
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: needle, mode: "insensitive" } },
          { nameAr: { equals: needle, mode: "insensitive" } },
          { nameEn: { equals: needle, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    return category?.id ?? null;
  },
  ["item-search-category-id"],
  { revalidate: 300, tags: ["categories"] },
);

export const itemSearchRepository = {
  async findCategoryIdByName(name: string) {
    return getCachedCategoryIdByName(name);
  },

  async countByType(type: $Enums.ItemType, where: ItemWhereInput) {
    switch (type) {
      case $Enums.ItemType.NEW_CAR:
        return prisma.newCar.count({ where: where as Prisma.NewCarWhereInput });
      case $Enums.ItemType.USED_CAR:
        return prisma.oldCar.count({ where: where as Prisma.OldCarWhereInput });
      case $Enums.ItemType.PROPERTY:
        return prisma.property.count({
          where: where as Prisma.PropertyWhereInput,
        });
      case $Enums.ItemType.OTHER:
        return prisma.otherItem.count({
          where: where as Prisma.OtherItemWhereInput,
        });
    }
  },

  async findByType(
    type: $Enums.ItemType,
    where: ItemWhereInput,
    options?: { skip?: number; take?: number },
  ): Promise<ItemSearchItemDto[]> {
    const pagination = {
      ...(typeof options?.skip === "number" ? { skip: options.skip } : {}),
      ...(typeof options?.take === "number" ? { take: options.take } : {}),
    };

    switch (type) {
      case $Enums.ItemType.NEW_CAR: {
        const items = await prisma.newCar.findMany({
          where: where as Prisma.NewCarWhereInput,
          select: newCarSelect,
          orderBy: defaultOrderBy,
          ...pagination,
        });

        return items.map((item) => ({
          ...item,
          type,
          price: Number(item.price),
          sellOrRent: item.sellOrRent,
          rentType: item.rentType,
          status: item.status,
          fuelType: item.fuelType,
          gearType: item.gearType,
        }));
      }

      case $Enums.ItemType.USED_CAR: {
        const items = await prisma.oldCar.findMany({
          where: where as Prisma.OldCarWhereInput,
          select: oldCarSelect,
          orderBy: defaultOrderBy,
          ...pagination,
        });

        return items.map((item) => ({
          ...item,
          type,
          price: Number(item.price),
          sellOrRent: item.sellOrRent,
          rentType: item.rentType,
          status: item.status,
          fuelType: item.fuelType,
          gearType: item.gearType,
        }));
      }

      case $Enums.ItemType.PROPERTY: {
        const items = await prisma.property.findMany({
          where: where as Prisma.PropertyWhereInput,
          select: propertySelect,
          orderBy: defaultOrderBy,
          ...pagination,
        });

        return items.map((item) => ({
          ...item,
          type,
          price: Number(item.price),
          sellOrRent: item.sellOrRent,
          rentType: item.rentType,
          status: item.status,
        }));
      }

      case $Enums.ItemType.OTHER: {
        const items = await prisma.otherItem.findMany({
          where: where as Prisma.OtherItemWhereInput,
          select: otherItemSelect,
          orderBy: defaultOrderBy,
          ...pagination,
        });

        return items.map((item) => ({
          ...item,
          type,
          price: Number(item.price),
          sellOrRent: item.sellOrRent,
          rentType: item.rentType,
          status: item.status,
        }));
      }
    }
  },

  async attachMetadataBatch(items: ItemSearchItemDto[]) {
    if (items.length === 0) {
      return [];
    }

    const itemIds = items.map((item) => item.id);
    const featuredCutoff = getFeaturedCutoffDate();

    const [images, reviewsAgg, featuredPins] = await Promise.all([
      prisma.itemImage.findMany({
        where: { itemId: { in: itemIds } },
        orderBy: [{ itemId: "asc" }, { createdAt: "asc" }],
        select: { itemId: true, url: true },
      }),
      prisma.review.groupBy({
        by: ["itemId"],
        where: { itemId: { in: itemIds } },
        _count: { _all: true },
        _avg: { rate: true },
      }),
      prisma.pinnedItem.findMany({
        where: {
          itemId: { in: itemIds },
          createdAt: { gte: featuredCutoff },
        },
        orderBy: { createdAt: "desc" },
        select: {
          itemId: true,
          itemType: true,
          createdAt: true,
        },
      }),
    ]);

    const imagesMap = images.reduce<Record<string, Array<{ url: string }>>>(
      (result, image) => {
        (result[image.itemId] ||= []).push({ url: image.url });
        return result;
      },
      {},
    );

    const reviewsMap = reviewsAgg.reduce<
      Record<string, { count: number; average: number | null }>
    >((result, review) => {
      result[review.itemId] = {
        count: review._count._all,
        average: review._avg.rate,
      };
      return result;
    }, {});

    const featuredMap = featuredPins.reduce<Record<string, Date>>(
      (result, pin) => {
        const key = `${pin.itemType}:${pin.itemId}`;
        const current = result[key];
        if (!current || pin.createdAt > current) {
          result[key] = pin.createdAt;
        }

        return result;
      },
      {},
    );

    return items.map((item) => {
      const review = reviewsMap[item.id] ?? { count: 0, average: null };
      const featuredAt = featuredMap[`${item.type}:${item.id}`];

      return {
        ...item,
        images: imagesMap[item.id] ?? [],
        reviewsCount: review.count,
        averageRating:
          review.average !== null ? Number(review.average.toFixed(2)) : null,
        isFeatured: Boolean(featuredAt),
        featuredAt: featuredAt?.toISOString() ?? null,
      } satisfies ItemSearchItemDto;
    });
  },
};
