import { NextResponse } from "next/server";
import { ItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CACHE_HEADERS } from "@/app/api/lib/cacheHeaders";

type ItemCountsPayload = {
  success: true;
  counts: Record<ItemType, number>;
};

const COUNTS_TTL_MS = 30 * 1000;
const COUNTS_STALE_TTL_MS = 5 * 60 * 1000;

let countsSnapshot: {
  value: ItemCountsPayload;
  expiresAt: number;
  staleUntil: number;
} | null = null;

const readCachedCounts = (allowStale = false): ItemCountsPayload | null => {
  if (!countsSnapshot) return null;

  const now = Date.now();
  if (countsSnapshot.staleUntil <= now) {
    countsSnapshot = null;
    return null;
  }

  if (!allowStale && countsSnapshot.expiresAt <= now) {
    return null;
  }

  return countsSnapshot.value;
};

const writeCachedCounts = (value: ItemCountsPayload) => {
  countsSnapshot = {
    value,
    expiresAt: Date.now() + COUNTS_TTL_MS,
    staleUntil: Date.now() + COUNTS_STALE_TTL_MS,
  };
};

export async function GET() {
  const freshCached = readCachedCounts(false);
  if (freshCached) {
    return NextResponse.json(freshCached, {
      headers: {
        "Cache-Control": CACHE_HEADERS.publicShort,
      },
    });
  }

  const baseWhere = {
    isDeleted: false,
    status: "AVAILABLE" as const,
  };

  try {
    const [
      properties,
      newCars,
      usedCars,
      homeFurniture,
      medicalDevices,
      other,
    ] = await prisma.$transaction([
      prisma.property.count({ where: baseWhere }),
      prisma.newCar.count({ where: baseWhere }),
      prisma.oldCar.count({ where: baseWhere }),
      prisma.homeFurniture.count({ where: baseWhere }),
      prisma.medicalDevice.count({ where: baseWhere }),
      prisma.otherItem.count({ where: baseWhere }),
    ]);

    const payload: ItemCountsPayload = {
      success: true,
      counts: {
        [ItemType.PROPERTY]: properties,
        [ItemType.NEW_CAR]: newCars,
        [ItemType.USED_CAR]: usedCars,
        [ItemType.HOME_FURNITURE]: homeFurniture,
        [ItemType.MEDICAL_DEVICE]: medicalDevices,
        [ItemType.OTHER]: other,
      },
    };

    writeCachedCounts(payload);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": CACHE_HEADERS.publicShort,
      },
    });
  } catch (error) {
    const staleCached = readCachedCounts(true);
    if (staleCached) {
      return NextResponse.json(staleCached, {
        headers: {
          "Cache-Control": CACHE_HEADERS.publicShort,
          "x-cache": "stale-fallback",
        },
      });
    }

    throw error;
  }
}
