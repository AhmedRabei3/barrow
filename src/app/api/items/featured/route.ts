import { NextRequest, NextResponse } from "next/server";
import { ItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { attachExtrasBatch } from "../functions/helpers";
import { getFeaturedCutoffDate } from "@/lib/featuredAds";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

const getFeaturedItemByType = async (itemType: ItemType, itemId: string) => {
  switch (itemType) {
    case ItemType.NEW_CAR: {
      const item = await prisma.newCar.findFirst({
        where: {
          id: itemId,
          isDeleted: false,
          status: "AVAILABLE",
        },
        include: { location: true, category: true },
      });
      return item ? { ...item, type: ItemType.NEW_CAR } : null;
    }

    case ItemType.USED_CAR: {
      const item = await prisma.oldCar.findFirst({
        where: {
          id: itemId,
          isDeleted: false,
          status: "AVAILABLE",
        },
        include: { location: true, category: true },
      });
      return item ? { ...item, type: ItemType.USED_CAR } : null;
    }

    case ItemType.PROPERTY: {
      const item = await prisma.property.findFirst({
        where: {
          id: itemId,
          isDeleted: false,
          status: "AVAILABLE",
        },
        include: { location: true, category: true },
      });
      return item ? { ...item, type: ItemType.PROPERTY } : null;
    }

    case ItemType.OTHER: {
      const item = await prisma.otherItem.findFirst({
        where: {
          id: itemId,
          isDeleted: false,
          status: "AVAILABLE",
        },
        include: { location: true, category: true },
      });
      return item ? { ...item, type: ItemType.OTHER } : null;
    }

    default:
      return null;
  }
};

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    const limitParam = Number(req.nextUrl.searchParams.get("limit") || 8);
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(20, limitParam))
      : 8;

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

    const featuredItems: Array<
      {
        id: string;
        location?: unknown | null;
      } & Record<string, unknown>
    > = [];

    for (const pin of pins) {
      const item = await getFeaturedItemByType(pin.itemType, pin.itemId);
      if (!item) {
        continue;
      }

      featuredItems.push(
        item as {
          id: string;
          location?: unknown | null;
        } & Record<string, unknown>,
      );

      if (featuredItems.length >= limit) {
        break;
      }
    }

    const enrichedItems = await attachExtrasBatch(featuredItems);

    return NextResponse.json({
      success: true,
      totalCount: enrichedItems.length,
      items: enrichedItems,
    });
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
