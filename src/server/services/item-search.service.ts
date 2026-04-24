import { $Enums } from "@prisma/client";
import { unstable_cache } from "next/cache";
import type {
  ItemSearchItemDto,
  ItemSearchQueryDto,
  ItemSearchResponseDto,
} from "@/features/items/types";
import { itemSearchRepository } from "@/server/repositories/item-search.repository";

const ITEM_TYPES: $Enums.ItemType[] = [
  $Enums.ItemType.NEW_CAR,
  $Enums.ItemType.USED_CAR,
  $Enums.ItemType.PROPERTY,
  $Enums.ItemType.HOME_FURNITURE,
  $Enums.ItemType.MEDICAL_DEVICE,
  $Enums.ItemType.OTHER,
];

type SerializableSearchQuery = Omit<
  ItemSearchQueryDto,
  "userLat" | "userLng"
> & {
  userLat: null;
  userLng: null;
};

const normalizeSearchQuery = (
  query: ItemSearchQueryDto,
): ItemSearchQueryDto => ({
  ...query,
  q: query.q.trim().replace(/\s+/g, " "),
  city: query.city?.trim().replace(/\s+/g, " "),
  country: query.country?.trim().replace(/\s+/g, " "),
  catName: query.catName?.trim().replace(/\s+/g, " "),
  action: query.action?.trim(),
});

const toSerializableNonGeoQuery = (
  query: ItemSearchQueryDto,
): SerializableSearchQuery => ({
  ...query,
  userLat: null,
  userLng: null,
});

const serializeNonGeoQuery = (query: SerializableSearchQuery) =>
  JSON.stringify({
    q: query.q,
    type: query.type,
    city: query.city,
    country: query.country,
    catName: query.catName,
    action: query.action,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    page: query.page,
    limit: query.limit,
    userLat: null,
    userLng: null,
  } satisfies SerializableSearchQuery);

const buildSearchCondition = (type: $Enums.ItemType, q: string) => {
  if (!q) {
    return undefined;
  }

  const contains = { contains: q, mode: "insensitive" as const };

  switch (type) {
    case $Enums.ItemType.NEW_CAR:
    case $Enums.ItemType.USED_CAR:
      return {
        OR: [
          { brand: contains },
          { model: contains },
          { description: contains },
        ],
      };
    case $Enums.ItemType.PROPERTY:
      return {
        OR: [{ title: contains }, { description: contains }],
      };
    case $Enums.ItemType.HOME_FURNITURE:
      return {
        OR: [
          { name: contains },
          { brand: contains },
          { description: contains },
          { material: contains },
          { roomType: contains },
        ],
      };
    case $Enums.ItemType.MEDICAL_DEVICE:
      return {
        OR: [
          { name: contains },
          { manufacturer: contains },
          { model: contains },
          { description: contains },
          { deviceClass: contains },
        ],
      };
    case $Enums.ItemType.OTHER:
      return {
        OR: [
          { name: contains },
          { brand: contains },
          { description: contains },
        ],
      };
  }
};

const normalizeAction = (action?: string) => {
  if (!action) {
    return undefined;
  }

  if (action === "SELL" || action === "Buy") {
    return $Enums.TransactionType.SELL;
  }

  if (action === "RENT" || action === "Rent") {
    return $Enums.TransactionType.RENT;
  }

  return undefined;
};

const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const sortByNearest = (
  items: ItemSearchItemDto[],
  userLat: number | null,
  userLng: number | null,
) => {
  const resolveDistance = (item: ItemSearchItemDto) => {
    if (userLat === null || userLng === null) {
      return Number.POSITIVE_INFINITY;
    }

    const lat = item.location?.latitude;
    const lng = item.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return Number.POSITIVE_INFINITY;
    }

    return haversineKm(userLat, userLng, lat, lng);
  };

  const resolveCreatedAt = (item: ItemSearchItemDto) => {
    if (!item.createdAt) {
      return 0;
    }

    const timestamp = new Date(item.createdAt).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  return [...items].sort((left, right) => {
    const distanceDiff = resolveDistance(left) - resolveDistance(right);
    if (distanceDiff !== 0) {
      return distanceDiff;
    }

    const ratingDiff =
      Number(right.averageRating ?? 0) - Number(left.averageRating ?? 0);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }

    return resolveCreatedAt(right) - resolveCreatedAt(left);
  });
};

const sortFeaturedFirst = (items: ItemSearchItemDto[]) => {
  return [...items].sort((left, right) => {
    const leftFeatured = Boolean(left.isFeatured);
    const rightFeatured = Boolean(right.isFeatured);

    if (leftFeatured !== rightFeatured) {
      return leftFeatured ? -1 : 1;
    }

    const leftFeaturedAt = left.featuredAt
      ? new Date(left.featuredAt).getTime()
      : 0;
    const rightFeaturedAt = right.featuredAt
      ? new Date(right.featuredAt).getTime()
      : 0;

    return rightFeaturedAt - leftFeaturedAt;
  });
};

const buildWhereForType = async (
  query: ItemSearchQueryDto,
  type: $Enums.ItemType,
) => {
  const where: Record<string, unknown> = {
    isDeleted: false,
    status: "AVAILABLE",
  };

  const search = buildSearchCondition(type, query.q);
  if (search) {
    Object.assign(where, search);
  }

  if (query.city || query.country) {
    where.location = {
      ...(query.city
        ? {
            city: {
              contains: query.city,
              mode: "insensitive",
            },
          }
        : {}),
      ...(query.country
        ? {
            country: {
              equals: query.country,
              mode: "insensitive",
            },
          }
        : {}),
    };
  }

  const action = normalizeAction(query.action);
  if (action) {
    where.sellOrRent = action;
  }

  if (
    typeof query.minPrice === "number" ||
    typeof query.maxPrice === "number"
  ) {
    where.price = {
      ...(typeof query.minPrice === "number" ? { gte: query.minPrice } : {}),
      ...(typeof query.maxPrice === "number" ? { lte: query.maxPrice } : {}),
    };
  }

  if (query.catName && query.catName !== "All") {
    const categoryId = await itemSearchRepository.findCategoryIdByName(
      query.catName,
    );
    where.categoryId = categoryId ?? "__missing_category__";
  }

  return where;
};

async function searchItemsUncached(
  query: ItemSearchQueryDto,
): Promise<ItemSearchResponseDto> {
  const { page, limit, type, userLat, userLng } = query;
  const skip = (page - 1) * limit;
  const hasGeoSort = userLat !== null && userLng !== null;

  if (!type) {
    const whereEntries = await Promise.all(
      ITEM_TYPES.map(
        async (itemType) =>
          [itemType, await buildWhereForType(query, itemType)] as const,
      ),
    );
    const whereByType = new Map(whereEntries);

    if (!hasGeoSort) {
      const counts = await Promise.all(
        ITEM_TYPES.map((itemType) =>
          itemSearchRepository.countByType(
            itemType,
            whereByType.get(itemType) ?? {},
          ),
        ),
      );

      const totalCount = counts.reduce((sum, count) => sum + count, 0);
      if (totalCount === 0) {
        return { success: true, page, limit, totalCount, items: [] };
      }

      let remainingSkip = skip;
      let remainingTake = limit;
      const pagedItems: ItemSearchItemDto[] = [];

      for (let index = 0; index < ITEM_TYPES.length; index += 1) {
        const itemType = ITEM_TYPES[index];
        const currentCount = counts[index];

        if (remainingTake <= 0) {
          break;
        }

        if (remainingSkip >= currentCount) {
          remainingSkip -= currentCount;
          continue;
        }

        const take = Math.min(remainingTake, currentCount - remainingSkip);
        const batch = await itemSearchRepository.findByType(
          itemType,
          whereByType.get(itemType) ?? {},
          { skip: remainingSkip, take },
        );

        pagedItems.push(...batch);
        remainingTake -= take;
        remainingSkip = 0;
      }

      const enrichedItems =
        await itemSearchRepository.attachMetadataBatch(pagedItems);

      return {
        success: true,
        page,
        limit,
        totalCount,
        items: sortFeaturedFirst(enrichedItems),
      };
    }

    const resultSets = await Promise.all(
      ITEM_TYPES.map((itemType) =>
        itemSearchRepository.findByType(
          itemType,
          whereByType.get(itemType) ?? {},
        ),
      ),
    );

    const enrichedItems = await itemSearchRepository.attachMetadataBatch(
      resultSets.flat(),
    );
    const sortedItems = sortByNearest(enrichedItems, userLat, userLng);

    return {
      success: true,
      page,
      limit,
      totalCount: sortedItems.length,
      items: sortFeaturedFirst(sortedItems.slice(skip, skip + limit)),
    };
  }

  const where = await buildWhereForType(query, type);

  if (!hasGeoSort) {
    const [totalCount, pagedItems] = await Promise.all([
      itemSearchRepository.countByType(type, where),
      itemSearchRepository.findByType(type, where, { skip, take: limit }),
    ]);

    const enrichedItems =
      await itemSearchRepository.attachMetadataBatch(pagedItems);

    return {
      success: true,
      page,
      limit,
      totalCount,
      items: sortFeaturedFirst(enrichedItems),
    };
  }

  const allItems = await itemSearchRepository.findByType(type, where);
  const enrichedItems =
    await itemSearchRepository.attachMetadataBatch(allItems);
  const sortedItems = sortByNearest(enrichedItems, userLat, userLng);

  return {
    success: true,
    page,
    limit,
    totalCount: sortedItems.length,
    items: sortFeaturedFirst(sortedItems.slice(skip, skip + limit)),
  };
}

const getCachedNonGeoSearch = unstable_cache(
  async (serializedQuery: string) => {
    const query = JSON.parse(serializedQuery) as SerializableSearchQuery;
    return searchItemsUncached(query);
  },
  ["item-search-results-v3"],
  { revalidate: 60, tags: ["item-search"] },
);

export async function searchItems(
  query: ItemSearchQueryDto,
): Promise<ItemSearchResponseDto> {
  const normalizedQuery = normalizeSearchQuery(query);

  if (normalizedQuery.userLat === null && normalizedQuery.userLng === null) {
    return getCachedNonGeoSearch(
      serializeNonGeoQuery(toSerializableNonGeoQuery(normalizedQuery)),
    );
  }

  return searchItemsUncached(normalizedQuery);
}
