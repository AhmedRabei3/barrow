import { prisma } from "@/lib/prisma";
import { Availability } from "@prisma/client";

export type SitemapModelKey = "property" | "newCar" | "oldCar" | "otherItem";

export interface SitemapModelShardMeta {
  model: SitemapModelKey;
  shardCount: number;
}

export const SITEMAP_CHUNK_SIZE = 5000;

const MODELS: SitemapModelKey[] = ["property", "newCar", "oldCar", "otherItem"];

export const getSitemapShardMeta = async (): Promise<
  SitemapModelShardMeta[]
> => {
  const [propertyCount, newCarCount, oldCarCount, otherItemCount] =
    await Promise.all([
      prisma.property.count({ where: { isDeleted: false, status: Availability.AVAILABLE } }),
      prisma.newCar.count({ where: { isDeleted: false, status: Availability.AVAILABLE } }),
      prisma.oldCar.count({ where: { isDeleted: false, status: Availability.AVAILABLE } }),
      prisma.otherItem.count({ where: { isDeleted: false, status: Availability.AVAILABLE } }),
    ]);

  const counts: Record<SitemapModelKey, number> = {
    property: propertyCount,
    newCar: newCarCount,
    oldCar: oldCarCount,
    otherItem: otherItemCount,
  };

  return MODELS.map((model) => ({
    model,
    shardCount: Math.max(1, Math.ceil(counts[model] / SITEMAP_CHUNK_SIZE)),
  }));
};

export const resolveSitemapShard = (
  shardId: number,
  meta: SitemapModelShardMeta[],
): { model: SitemapModelKey; index: number } => {
  let cursor = shardId;

  for (const entry of meta) {
    if (cursor < entry.shardCount) {
      return { model: entry.model, index: cursor };
    }
    cursor -= entry.shardCount;
  }

  return { model: "property", index: 0 };
};

export const getTotalSitemapShards = (meta: SitemapModelShardMeta[]) =>
  meta.reduce((sum, entry) => sum + entry.shardCount, 0);
