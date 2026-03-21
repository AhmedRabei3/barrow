import { NextRequest, NextResponse } from "next/server";
import { $Enums } from "@prisma/client";
import { attachExtrasBatch, buildWhere } from "./functions/helpers";
import { prisma } from "@/lib/prisma";
import { BaseItem } from "./type";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

type ItemWithLocation = BaseItem & {
  location?: {
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};

const toFiniteNumber = (value: string | null) => {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const sortByNearest = (
  items: ItemWithLocation[],
  userLat: number | null,
  userLng: number | null,
) => {
  if (userLat === null || userLng === null) return items;

  const getDistance = (item: ItemWithLocation) => {
    const lat = item.location?.latitude;
    const lng = item.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return Number.POSITIVE_INFINITY;
    }
    return haversineKm(userLat, userLng, lat, lng);
  };

  return [...items].sort((a, b) => getDistance(a) - getDistance(b));
};

const sortFeaturedFirst = <T extends { isFeatured?: boolean; featuredAt?: string | null }>(
  items: T[],
) => {
  return [...items].sort((a, b) => {
    const aFeatured = Boolean(a.isFeatured);
    const bFeatured = Boolean(b.isFeatured);

    if (aFeatured !== bFeatured) {
      return aFeatured ? -1 : 1;
    }

    const aTs = a.featuredAt ? new Date(a.featuredAt).getTime() : 0;
    const bTs = b.featuredAt ? new Date(b.featuredAt).getTime() : 0;
    return bTs - aTs;
  });
};

const ITEM_TYPES: $Enums.ItemType[] = [
  $Enums.ItemType.NEW_CAR,
  $Enums.ItemType.USED_CAR,
  $Enums.ItemType.PROPERTY,
  $Enums.ItemType.OTHER,
];

const countItemsByType = async (
  type: $Enums.ItemType,
  where: Record<string, unknown>,
) => {
  switch (type) {
    case $Enums.ItemType.NEW_CAR:
      return prisma.newCar.count({ where });
    case $Enums.ItemType.USED_CAR:
      return prisma.oldCar.count({ where });
    case $Enums.ItemType.PROPERTY:
      return prisma.property.count({ where });
    case $Enums.ItemType.OTHER:
      return prisma.otherItem.count({ where });
  }
};

const findItemsByType = async (
  type: $Enums.ItemType,
  where: Record<string, unknown>,
  options?: { skip?: number; take?: number },
) => {
  const skip = options?.skip;
  const take = options?.take;

  switch (type) {
    case $Enums.ItemType.NEW_CAR: {
      const items = await prisma.newCar.findMany({
        where,
        include: { location: true, category: true },
        ...(typeof skip === "number" ? { skip } : {}),
        ...(typeof take === "number" ? { take } : {}),
      });
      return items.map((item) => ({
        ...item,
        type: $Enums.ItemType.NEW_CAR,
      })) as BaseItem[];
    }

    case $Enums.ItemType.USED_CAR: {
      const items = await prisma.oldCar.findMany({
        where,
        include: { location: true, category: true },
        ...(typeof skip === "number" ? { skip } : {}),
        ...(typeof take === "number" ? { take } : {}),
      });
      return items.map((item) => ({
        ...item,
        type: $Enums.ItemType.USED_CAR,
      })) as BaseItem[];
    }

    case $Enums.ItemType.PROPERTY: {
      const items = await prisma.property.findMany({
        where,
        include: { location: true, category: true },
        ...(typeof skip === "number" ? { skip } : {}),
        ...(typeof take === "number" ? { take } : {}),
      });
      return items.map((item) => ({
        ...item,
        type: $Enums.ItemType.PROPERTY,
      })) as BaseItem[];
    }

    case $Enums.ItemType.OTHER: {
      const items = await prisma.otherItem.findMany({
        where,
        include: { location: true, category: true },
        ...(typeof skip === "number" ? { skip } : {}),
        ...(typeof take === "number" ? { take } : {}),
      });
      return items.map((item) => ({
        ...item,
        type: $Enums.ItemType.OTHER,
      })) as BaseItem[];
    }
  }
};

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  try {
    const params = new URL(req.url).searchParams;

    const q = params.get("q")?.trim() || "";
    const type = params.get("type") as $Enums.ItemType | null;
    const city = params.get("city") ?? undefined;
    const country = params.get("country") ?? undefined;
    const catName = params.get("catName") ?? undefined;
    const action = params.get("action") ?? undefined;
    const minPrice = params.get("minPrice") ?? undefined;
    const maxPrice = params.get("maxPrice") ?? undefined;
    const userLat = toFiniteNumber(params.get("lat"));
    const userLng = toFiniteNumber(params.get("lng"));
    const page = Number(params.get("page")) || 1;
    const limit = Number(params.get("limit")) || 20;
    const skip = (page - 1) * limit;

    const hasGeoSort = userLat !== null && userLng !== null;

    /* -------------------------------
       بدون type → كل الجداول
    ------------------------------- */
    if (!type) {
      const whereByTypeEntries = await Promise.all(
        ITEM_TYPES.map(async (t) => {
          const where = await buildWhere({
            q,
            type: t,
            action,
            minPrice,
            maxPrice,
            catName,
            city,
            country,
          });

          return [t, where] as const;
        }),
      );

      const whereByType = new Map<$Enums.ItemType, Record<string, unknown>>(
        whereByTypeEntries,
      );

      if (!hasGeoSort) {
        const counts = await Promise.all(
          ITEM_TYPES.map(async (t) =>
            countItemsByType(t, whereByType.get(t) || {}),
          ),
        );

        const totalCount = counts.reduce((sum, count) => sum + count, 0);
        if (totalCount === 0) {
          return NextResponse.json({
            success: true,
            page,
            limit,
            totalCount,
            items: [],
          });
        }

        let remainingSkip = skip;
        let remainingTake = limit;
        const pagedItems: BaseItem[] = [];

        for (let index = 0; index < ITEM_TYPES.length; index += 1) {
          const currentType = ITEM_TYPES[index];
          const currentCount = counts[index];

          if (remainingTake <= 0) {
            break;
          }

          if (remainingSkip >= currentCount) {
            remainingSkip -= currentCount;
            continue;
          }

          const takeFromCurrent = Math.min(
            remainingTake,
            currentCount - remainingSkip,
          );

          const batch = await findItemsByType(
            currentType,
            whereByType.get(currentType) || {},
            {
              skip: remainingSkip,
              take: takeFromCurrent,
            },
          );

          pagedItems.push(...batch);
          remainingTake -= takeFromCurrent;
          remainingSkip = 0;
        }

        const enrichedItems = await attachExtrasBatch(pagedItems);

        return NextResponse.json({
          success: true,
          page,
          limit,
          totalCount,
          items: sortFeaturedFirst(enrichedItems),
        });
      }

      const results = await Promise.all(
        ITEM_TYPES.map(async (t) =>
          findItemsByType(t, whereByType.get(t) || {}),
        ),
      );

      const merged = results.flatMap((r) => r) as ItemWithLocation[];
      const sorted = sortByNearest(merged, userLat, userLng);
      const totalCount = sorted.length;
      const pagedItems = sorted.slice(skip, skip + limit);

      const enrichedItems = await attachExtrasBatch(pagedItems);

      return NextResponse.json({
        success: true,
        page,
        limit,
        totalCount,
        items: sortFeaturedFirst(enrichedItems),
      });
    }

    /* -------------------------------
       type معروف → جدول واحد
    ------------------------------- */
    const where = await buildWhere({
      q,
      type,
      action,
      minPrice,
      maxPrice,
      catName,
      city,
      country,
    });

    if (!hasGeoSort) {
      const [totalCount, pagedItems] = await Promise.all([
        countItemsByType(type, where),
        findItemsByType(type, where, { skip, take: limit }),
      ]);

      const enrichedItems = await attachExtrasBatch(pagedItems);

      return NextResponse.json({
        success: true,
        page,
        limit,
        totalCount,
        items: sortFeaturedFirst(enrichedItems),
      });
    }

    const items = (await findItemsByType(type, where)) as ItemWithLocation[];

    const sorted = sortByNearest(items, userLat, userLng);
    const totalCount = sorted.length;
    const pagedItems = sorted.slice(skip, skip + limit);

    const enrichedItems = await attachExtrasBatch(pagedItems);

    return NextResponse.json({
      success: true,
      page,
      limit,
      totalCount,
      items: sortFeaturedFirst(enrichedItems),
    });
  } catch (err) {
    console.error("🔥 GET /api/items ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        message: localizeErrorMessage("Server Error", isArabic),
      },
      { status: 500 },
    );
  }
}
