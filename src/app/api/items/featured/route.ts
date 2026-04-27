import { NextRequest, NextResponse } from "next/server";
import { ItemType, Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { attachExtrasBatch } from "../functions/helpers";
import { getFeaturedCutoffDate } from "@/lib/featuredAds";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

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

const buildAvailableWhere = <T extends string>(ids: T[]) => ({
  id: { in: ids },
  isDeleted: false,
  status: "AVAILABLE" as const,
});

const getCachedFeaturedItems = unstable_cache(
  async (limit: number) => {
    try {
      const featuredCutoff = getFeaturedCutoffDate();

      const pins = await prisma.pinnedItem.findMany({
        where: { createdAt: { gte: featuredCutoff } },
        orderBy: { createdAt: "desc" },
        take: Math.min(limit * 4, 60),
        select: {
          itemId: true,
          itemType: true,
        },
      });

      if (pins.length === 0) {
        return [];
      }

      const idsByType = {
        [ItemType.NEW_CAR]: pins
          .filter((pin) => pin.itemType === ItemType.NEW_CAR)
          .map((pin) => pin.itemId),
        [ItemType.USED_CAR]: pins
          .filter((pin) => pin.itemType === ItemType.USED_CAR)
          .map((pin) => pin.itemId),
        [ItemType.PROPERTY]: pins
          .filter((pin) => pin.itemType === ItemType.PROPERTY)
          .map((pin) => pin.itemId),
        [ItemType.OTHER]: pins
          .filter((pin) => pin.itemType === ItemType.OTHER)
          .map((pin) => pin.itemId),
      };

      const [newCars, oldCars, properties, otherItems] = await Promise.all([
        idsByType[ItemType.NEW_CAR].length
          ? prisma.newCar.findMany({
              where: buildAvailableWhere(idsByType[ItemType.NEW_CAR]),
              select: newCarSelect,
            })
          : Promise.resolve([]),
        idsByType[ItemType.USED_CAR].length
          ? prisma.oldCar.findMany({
              where: buildAvailableWhere(idsByType[ItemType.USED_CAR]),
              select: oldCarSelect,
            })
          : Promise.resolve([]),
        idsByType[ItemType.PROPERTY].length
          ? prisma.property.findMany({
              where: buildAvailableWhere(idsByType[ItemType.PROPERTY]),
              select: propertySelect,
            })
          : Promise.resolve([]),
        idsByType[ItemType.OTHER].length
          ? prisma.otherItem.findMany({
              where: buildAvailableWhere(idsByType[ItemType.OTHER]),
              select: otherItemSelect,
            })
          : Promise.resolve([]),
      ]);

      const itemMap = new Map<string, Record<string, unknown>>();

      for (const item of newCars)
        itemMap.set(`${ItemType.NEW_CAR}:${item.id}`, {
          ...item,
          type: ItemType.NEW_CAR,
        });
      for (const item of oldCars)
        itemMap.set(`${ItemType.USED_CAR}:${item.id}`, {
          ...item,
          type: ItemType.USED_CAR,
        });
      for (const item of properties)
        itemMap.set(`${ItemType.PROPERTY}:${item.id}`, {
          ...item,
          type: ItemType.PROPERTY,
        });
      for (const item of otherItems)
        itemMap.set(`${ItemType.OTHER}:${item.id}`, {
          ...item,
          type: ItemType.OTHER,
        });

      const orderedItems: Array<
        { id: string; location?: unknown | null } & Record<string, unknown>
      > = [];

      for (const pin of pins) {
        const item = itemMap.get(`${pin.itemType}:${pin.itemId}`);
        if (!item) {
          continue;
        }

        orderedItems.push(
          item as { id: string; location?: unknown | null } & Record<
            string,
            unknown
          >,
        );

        if (orderedItems.length >= limit) {
          break;
        }
      }

      return attachExtrasBatch(orderedItems);
    } catch (err: unknown) {
      // Absorb timeouts and DB errors so unstable_cache never propagates them
      // to the Next.js error logger. The GET handler returns [] gracefully.
      if (process.env.NODE_ENV === "development") {
        console.warn("[featured] getCachedFeaturedItems error:", err);
      }
      return [];
    }
  },
  ["featured-items-route"],
  { revalidate: 120, tags: ["featured-items"] },
);

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    const limitParam = Number(req.nextUrl.searchParams.get("limit") || 8);
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(20, limitParam))
      : 8;

    const enrichedItems = await getCachedFeaturedItems(limit);

    return NextResponse.json(
      {
        success: true,
        totalCount: enrichedItems.length,
        items: enrichedItems,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load featured items";

    return NextResponse.json(
      {
        success: false,
        message: localizeErrorMessage(message, isArabic),
      },
      { status: 500 },
    );
  }
}
