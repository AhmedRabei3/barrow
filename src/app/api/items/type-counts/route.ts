import { NextResponse } from "next/server";
import { $Enums } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CACHE_HEADERS } from "@/app/api/lib/cacheHeaders";

const BASE_WHERE = { isDeleted: false, status: "AVAILABLE" as const };

const TYPE_COUNTS_TTL_MS = 30 * 1000;
const TYPE_COUNTS_STALE_TTL_MS = 5 * 60 * 1000;

const TYPE_ENTRIES: Array<{ key: string; type: $Enums.ItemType }> = [
  { key: "PROPERTY", type: $Enums.ItemType.PROPERTY },
  { key: "NEW_CAR", type: $Enums.ItemType.NEW_CAR },
  { key: "USED_CAR", type: $Enums.ItemType.USED_CAR },
  { key: "HOME_FURNITURE", type: $Enums.ItemType.HOME_FURNITURE },
  { key: "MEDICAL_DEVICES", type: $Enums.ItemType.MEDICAL_DEVICE },
  { key: "OTHER", type: $Enums.ItemType.OTHER },
];

let typeCountsSnapshot: {
  value: Record<string, number>;
  expiresAt: number;
  staleUntil: number;
} | null = null;

const readTypeCountsCache = (allowStale = false) => {
  if (!typeCountsSnapshot) {
    return null;
  }

  const now = Date.now();
  if (typeCountsSnapshot.staleUntil <= now) {
    typeCountsSnapshot = null;
    return null;
  }

  if (!allowStale && typeCountsSnapshot.expiresAt <= now) {
    return null;
  }

  return typeCountsSnapshot.value;
};

const writeTypeCountsCache = (value: Record<string, number>) => {
  typeCountsSnapshot = {
    value,
    expiresAt: Date.now() + TYPE_COUNTS_TTL_MS,
    staleUntil: Date.now() + TYPE_COUNTS_STALE_TTL_MS,
  };
};

const getCachedTypeCounts = unstable_cache(
  async () => {
    const grouped = await prisma.listingSearchIndex.groupBy({
      by: ["itemType"],
      where: BASE_WHERE,
      _count: {
        _all: true,
      },
    });

    const countMap = new Map(
      grouped.map((entry) => [entry.itemType, entry._count._all]),
    );

    const result = Object.fromEntries(
      TYPE_ENTRIES.map(({ key, type }) => [key, countMap.get(type) ?? 0]),
    ) as Record<string, number>;

    writeTypeCountsCache(result);

    return result;
  },
  ["items:type-counts"],
  { revalidate: 300, tags: ["items"] },
);

export async function GET() {
  try {
    const warmCache = readTypeCountsCache(false);
    if (warmCache) {
      return NextResponse.json(warmCache, {
        headers: {
          "Cache-Control": CACHE_HEADERS.publicStandard,
          "x-cache": "memory-hit",
        },
      });
    }

    const counts = await getCachedTypeCounts();
    return NextResponse.json(counts, {
      headers: {
        "Cache-Control": CACHE_HEADERS.publicStandard,
      },
    });
  } catch {
    const staleCache = readTypeCountsCache(true);
    if (staleCache) {
      return NextResponse.json(staleCache, {
        headers: {
          "Cache-Control": CACHE_HEADERS.publicShort,
          "x-cache": "stale-fallback",
        },
      });
    }

    return NextResponse.json({}, { status: 500 });
  }
}
