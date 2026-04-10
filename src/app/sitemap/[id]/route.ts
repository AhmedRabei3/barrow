import { prisma } from "@/lib/prisma";
import { Availability } from "@prisma/client";
import {
  getSitemapShardMeta,
  resolveSitemapShard,
  SITEMAP_CHUNK_SIZE,
  type SitemapModelKey,
} from "@/lib/sitemap";
import { SITE_URL } from "@/lib/seo";

const getShardItems = async (model: SitemapModelKey, shardIndex: number) => {
  const query = {
    where: { isDeleted: false, status: Availability.AVAILABLE },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" as const },
    skip: shardIndex * SITEMAP_CHUNK_SIZE,
    take: SITEMAP_CHUNK_SIZE,
  };

  switch (model) {
    case "property":
      return prisma.property.findMany(query);
    case "newCar":
      return prisma.newCar.findMany(query);
    case "oldCar":
      return prisma.oldCar.findMany(query);
    case "otherItem":
      return prisma.otherItem.findMany(query);
  }
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await params;
  const shardId = Number(idParam);

  if (!Number.isInteger(shardId) || shardId < 0) {
    return new Response("Invalid sitemap shard id", { status: 400 });
  }

  const meta = await getSitemapShardMeta();
  const { model, index } = resolveSitemapShard(shardId, meta);
  const items = await getShardItems(model, index);

  const now = new Date().toISOString();
  const staticEntries =
    shardId === 0
      ? [
          `<url><loc>${SITE_URL}/</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
          `<url><loc>${SITE_URL}/verify-email</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.2</priority></url>`,
        ]
      : [];

  const itemEntries = items.map((item) => {
    return `<url><loc>${SITE_URL}/items/details/${item.id}</loc><lastmod>${new Date(item.updatedAt).toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`;
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...staticEntries, ...itemEntries].join("")}</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
