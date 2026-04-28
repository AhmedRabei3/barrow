import { NextResponse } from "next/server";
import { ItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const baseWhere = {
    isDeleted: false,
    status: "AVAILABLE" as const,
  };

  const [properties, newCars, usedCars, homeFurniture, medicalDevices, other] =
    await Promise.all([
      prisma.property.count({ where: baseWhere }),
      prisma.newCar.count({ where: baseWhere }),
      prisma.oldCar.count({ where: baseWhere }),
      prisma.homeFurniture.count({ where: baseWhere }),
      prisma.medicalDevice.count({ where: baseWhere }),
      prisma.otherItem.count({ where: baseWhere }),
    ]);

  return NextResponse.json(
    {
      success: true,
      counts: {
        [ItemType.PROPERTY]: properties,
        [ItemType.NEW_CAR]: newCars,
        [ItemType.USED_CAR]: usedCars,
        [ItemType.HOME_FURNITURE]: homeFurniture,
        [ItemType.MEDICAL_DEVICE]: medicalDevices,
        [ItemType.OTHER]: other,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
