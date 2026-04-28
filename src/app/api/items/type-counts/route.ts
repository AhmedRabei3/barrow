import { NextResponse } from "next/server";
import { $Enums } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { itemSearchRepository } from "@/server/repositories/item-search.repository";

const BASE_WHERE = { isDeleted: false, status: "AVAILABLE" as const };

const TYPE_ENTRIES: Array<{ key: string; type: $Enums.ItemType }> = [
  { key: "PROPERTY", type: $Enums.ItemType.PROPERTY },
  { key: "NEW_CAR", type: $Enums.ItemType.NEW_CAR },
  { key: "USED_CAR", type: $Enums.ItemType.USED_CAR },
  { key: "HOME_FURNITURE", type: $Enums.ItemType.HOME_FURNITURE },
  { key: "MEDICAL_DEVICES", type: $Enums.ItemType.MEDICAL_DEVICE },
  { key: "OTHER", type: $Enums.ItemType.OTHER },
];

const getCachedTypeCounts = unstable_cache(
  async () => {
    const pairs = await Promise.all(
      TYPE_ENTRIES.map(async ({ key, type }) => {
        const count = await itemSearchRepository.countByType(type, BASE_WHERE);
        return [key, count] as const;
      }),
    );
    return Object.fromEntries(pairs) as Record<string, number>;
  },
  ["items:type-counts"],
  { revalidate: 300, tags: ["items"] },
);

export async function GET() {
  try {
    const counts = await getCachedTypeCounts();
    return NextResponse.json(counts, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
