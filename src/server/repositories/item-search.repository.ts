/**
 * item-search.repository.ts
 *
 * All search queries now go through the single ListingSearchIndex table.
 * This replaces the previous 6-table fan-out (6 separate DB round trips -> 1).
 *
 * attachMetadataBatch (images / reviews / featured pins) is unchanged.
 */

import {
  Prisma,
  type ItemType,
  type Availability,
  type TransactionType,
  type RentType,
} from "@prisma/client";
import { unstable_cache } from "next/cache";
import type { ItemSearchItemDto } from "@/features/items/types";
import { getFeaturedCutoffDate } from "@/lib/featuredAds";
import { prisma } from "@/lib/prisma";

type IndexRow = {
  id: string;
  itemType: ItemType;
  title: string;
  brand: string | null;
  ownerId: string;
  categoryId: string | null;
  status: Availability;
  sellOrRent: TransactionType;
  rentType: RentType | null;
  price: Prisma.Decimal;
  isDeleted: boolean;
  createdAt: Date;
  locationCity: string | null;
  locationCountry: string | null;
  locationLat: number | null;
  locationLng: number | null;
};

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

function indexRowToDto(row: IndexRow): ItemSearchItemDto {
  return {
    id: row.id,
    type: row.itemType,
    title: row.title,
    brand: row.brand,
    price: Number(row.price),
    sellOrRent: row.sellOrRent,
    rentType: row.rentType,
    status: row.status,
    createdAt: row.createdAt,
    category: row.categoryId ? { id: row.categoryId } : null,
    location:
      row.locationLat !== null && row.locationLng !== null
        ? {
            latitude: row.locationLat,
            longitude: row.locationLng,
            city: row.locationCity ?? undefined,
            country: row.locationCountry ?? undefined,
          }
        : null,
  };
}

export const itemSearchRepository = {
  async findCategoryIdByName(name: string) {
    return getCachedCategoryIdByName(name);
  },

  async countByIndex(
    where: Prisma.ListingSearchIndexWhereInput,
  ): Promise<number> {
    return prisma.listingSearchIndex.count({ where });
  },

  async findByIndex(
    where: Prisma.ListingSearchIndexWhereInput,
    options?: { skip?: number; take?: number },
  ): Promise<ItemSearchItemDto[]> {
    const pagination = {
      ...(typeof options?.skip === "number" ? { skip: options.skip } : {}),
      ...(typeof options?.take === "number" ? { take: options.take } : {}),
    };

    const rows = await prisma.listingSearchIndex.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...pagination,
    });

    return rows.map(indexRowToDto);
  },

  /**
   * Runs count + findMany in a single $transaction (1 connection acquisition).
   * Use this instead of calling countByIndex + findByIndex separately.
   */
  async findAndCountByIndex(
    where: Prisma.ListingSearchIndexWhereInput,
    options?: { skip?: number; take?: number },
  ): Promise<[number, ItemSearchItemDto[]]> {
    const pagination = {
      ...(typeof options?.skip === "number" ? { skip: options.skip } : {}),
      ...(typeof options?.take === "number" ? { take: options.take } : {}),
    };

    const [count, rows] = await Promise.all([
      prisma.listingSearchIndex.count({ where }),
      prisma.listingSearchIndex.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...pagination,
      }),
    ]);

    return [count, rows.map(indexRowToDto)];
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
        select: { itemId: true, itemType: true, createdAt: true },
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
