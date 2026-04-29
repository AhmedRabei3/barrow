/**
 * item-search.service.ts
 *
 * Single-table search via ListingSearchIndex.
 * The old 6-table fan-out is replaced with 1 count + 1 findMany query.
 *
 * Geo-sort path still fetches all matching rows then sorts in memory,
 * the same as before but now with a single DB query instead of 6.
 */

import { Prisma, type TransactionType } from "@prisma/client";
import { unstable_cache } from "next/cache";
import type {
  ItemSearchItemDto,
  ItemSearchQueryDto,
  ItemSearchResponseDto,
} from "@/features/items/types";
import { itemSearchRepository } from "@/server/repositories/item-search.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SerializableSearchQuery = Omit<
  ItemSearchQueryDto,
  "userLat" | "userLng"
> & {
  userLat: null;
  userLng: null;
};

// ---------------------------------------------------------------------------
// Query normalisation
// ---------------------------------------------------------------------------

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
): SerializableSearchQuery => ({ ...query, userLat: null, userLng: null });

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

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

const normalizeAction = (action?: string): TransactionType | undefined => {
  if (!action) return undefined;
  if (action === "SELL" || action === "Buy") return "SELL";
  if (action === "RENT" || action === "Rent") return "RENT";
  return undefined;
};

/**
 * Build the ListingSearchIndex WHERE clause from a search query.
 * Category lookup result (if applicable) must be passed in as categoryId.
 */
function buildIndexWhere(
  query: ItemSearchQueryDto,
  categoryId?: string | null,
): Prisma.ListingSearchIndexWhereInput {
  const where: Prisma.ListingSearchIndexWhereInput = {
    isDeleted: false,
    status: "AVAILABLE",
  };

  if (query.type) where.itemType = query.type;

  if (query.q) {
    where.title = { contains: query.q, mode: "insensitive" };
  }

  if (query.city) {
    where.locationCity = { contains: query.city, mode: "insensitive" };
  }

  if (query.country) {
    where.locationCountry = { equals: query.country, mode: "insensitive" };
  }

  const action = normalizeAction(query.action);
  if (action) where.sellOrRent = action;

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
    where.categoryId = categoryId ?? "__missing_category__";
  }

  return where;
}

// ---------------------------------------------------------------------------
// Sorting helpers
// ---------------------------------------------------------------------------

const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const sortByNearest = (
  items: ItemSearchItemDto[],
  userLat: number | null,
  userLng: number | null,
) => {
  const dist = (item: ItemSearchItemDto) => {
    if (userLat === null || userLng === null) return Number.POSITIVE_INFINITY;
    const lat = item.location?.latitude;
    const lng = item.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number")
      return Number.POSITIVE_INFINITY;
    return haversineKm(userLat, userLng, lat, lng);
  };

  const ts = (item: ItemSearchItemDto) => {
    if (!item.createdAt) return 0;
    const t = new Date(item.createdAt).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  return [...items].sort((a, b) => {
    const dd = dist(a) - dist(b);
    if (dd !== 0) return dd;
    const rd = Number(b.averageRating ?? 0) - Number(a.averageRating ?? 0);
    if (rd !== 0) return rd;
    return ts(b) - ts(a);
  });
};

const sortFeaturedFirst = (items: ItemSearchItemDto[]) =>
  [...items].sort((a, b) => {
    const aF = Boolean(a.isFeatured);
    const bF = Boolean(b.isFeatured);
    if (aF !== bF) return aF ? -1 : 1;
    const aT = a.featuredAt ? new Date(a.featuredAt).getTime() : 0;
    const bT = b.featuredAt ? new Date(b.featuredAt).getTime() : 0;
    return bT - aT;
  });

// ---------------------------------------------------------------------------
// Core search (uncached)
// ---------------------------------------------------------------------------

async function searchItemsUncached(
  query: ItemSearchQueryDto,
): Promise<ItemSearchResponseDto> {
  const { page, limit, userLat, userLng } = query;
  const skip = (page - 1) * limit;
  const hasGeoSort = userLat !== null && userLng !== null;

  const categoryId =
    query.catName && query.catName !== "All"
      ? await itemSearchRepository.findCategoryIdByName(query.catName)
      : undefined;

  const where = buildIndexWhere(query, categoryId);

  // ── Non-geo: 2 parallel queries (count + page) ──────────────────────────
  if (!hasGeoSort) {
    const [totalCount, pagedItems] = await itemSearchRepository.findAndCountByIndex(where, { skip, take: limit });

    if (totalCount === 0) {
      return { success: true, page, limit, totalCount, items: [] };
    }

    const enriched = await itemSearchRepository.attachMetadataBatch(pagedItems);
    return {
      success: true,
      page,
      limit,
      totalCount,
      items: sortFeaturedFirst(enriched),
    };
  }

  // ── Geo-sort: fetch all matching, sort in-memory ─────────────────────────
  const allItems = await itemSearchRepository.findByIndex(where);
  const enriched = await itemSearchRepository.attachMetadataBatch(allItems);
  const sorted = sortByNearest(enriched, userLat, userLng);

  return {
    success: true,
    page,
    limit,
    totalCount: sorted.length,
    items: sortFeaturedFirst(sorted.slice(skip, skip + limit)),
  };
}

// ---------------------------------------------------------------------------
// Public API (with Next.js unstable_cache for non-geo queries)
// ---------------------------------------------------------------------------

const getCachedNonGeoSearch = unstable_cache(
  async (serializedQuery: string) => {
    const query = JSON.parse(serializedQuery) as SerializableSearchQuery;
    return searchItemsUncached(query);
  },
  ["item-search-results-v4"],
  { revalidate: 300, tags: ["item-search"] },
);

export async function searchItems(
  query: ItemSearchQueryDto,
): Promise<ItemSearchResponseDto> {
  const normalized = normalizeSearchQuery(query);

  if (normalized.userLat === null && normalized.userLng === null) {
    return getCachedNonGeoSearch(
      serializeNonGeoQuery(toSerializableNonGeoQuery(normalized)),
    );
  }

  return searchItemsUncached(normalized);
}
