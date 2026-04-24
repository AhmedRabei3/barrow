import { prisma } from "@/lib/prisma";
import { Availability } from "@prisma/client";
import { buildCategoryLandingPath, buildListingDetailsPath } from "@/lib/listingSeo";
import {
  getSitemapShardMeta,
  resolveSitemapShard,
  SITEMAP_CHUNK_SIZE,
  type SitemapModelKey,
} from "@/lib/sitemap";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const getShardItems = async (model: SitemapModelKey, shardIndex: number) => {
  const query = {
    where: { isDeleted: false, status: Availability.AVAILABLE },
    orderBy: { updatedAt: "desc" as const },
    skip: shardIndex * SITEMAP_CHUNK_SIZE,
    take: SITEMAP_CHUNK_SIZE,
  };

  switch (model) {
    case "property":
      return prisma.property
        .findMany({
          ...query,
          select: {
            id: true,
            updatedAt: true,
            title: true,
            location: { select: { city: true, country: true } },
          },
        })
        .then((items) =>
          items.map((item) => ({
            updatedAt: item.updatedAt,
            path: buildListingDetailsPath({
              id: item.id,
              title: item.title,
              city: item.location?.city,
              country: item.location?.country,
            }),
          })),
        );
    case "newCar":
      return prisma.newCar
        .findMany({
          ...query,
          select: {
            id: true,
            updatedAt: true,
            brand: true,
            model: true,
            location: { select: { city: true, country: true } },
          },
        })
        .then((items) =>
          items.map((item) => ({
            updatedAt: item.updatedAt,
            path: buildListingDetailsPath({
              id: item.id,
              brand: item.brand,
              model: item.model,
              city: item.location?.city,
              country: item.location?.country,
            }),
          })),
        );
    case "oldCar":
      return prisma.oldCar
        .findMany({
          ...query,
          select: {
            id: true,
            updatedAt: true,
            brand: true,
            model: true,
            location: { select: { city: true, country: true } },
          },
        })
        .then((items) =>
          items.map((item) => ({
            updatedAt: item.updatedAt,
            path: buildListingDetailsPath({
              id: item.id,
              brand: item.brand,
              model: item.model,
              city: item.location?.city,
              country: item.location?.country,
            }),
          })),
        );
    case "homeFurniture":
      return prisma.homeFurniture
        .findMany({
          ...query,
          select: {
            id: true,
            updatedAt: true,
            name: true,
            brand: true,
            location: { select: { city: true, country: true } },
          },
        })
        .then((items) =>
          items.map((item) => ({
            updatedAt: item.updatedAt,
            path: buildListingDetailsPath({
              id: item.id,
              name: item.name,
              brand: item.brand,
              city: item.location?.city,
              country: item.location?.country,
            }),
          })),
        );
    case "medicalDevice":
      return prisma.medicalDevice
        .findMany({
          ...query,
          select: {
            id: true,
            updatedAt: true,
            name: true,
            manufacturer: true,
            model: true,
            location: { select: { city: true, country: true } },
          },
        })
        .then((items) =>
          items.map((item) => ({
            updatedAt: item.updatedAt,
            path: buildListingDetailsPath({
              id: item.id,
              name: item.name,
              brand: item.manufacturer,
              model: item.model,
              city: item.location?.city,
              country: item.location?.country,
            }),
          })),
        );
    case "category":
      return prisma.category
        .findMany({
          where: { isDeleted: false },
          orderBy: { id: "desc" },
          skip: shardIndex * SITEMAP_CHUNK_SIZE,
          take: SITEMAP_CHUNK_SIZE,
          select: {
            id: true,
            name: true,
            type: true,
          },
        })
        .then((items) =>
          items.map((item) => ({
            updatedAt: new Date(),
            path: buildCategoryLandingPath({
              type: item.type,
              categoryId: item.id,
              categoryName: item.name,
            }),
          })),
        );
    case "otherItem":
      return prisma.otherItem
        .findMany({
          ...query,
          select: {
            id: true,
            updatedAt: true,
            name: true,
            brand: true,
            location: { select: { city: true, country: true } },
          },
        })
        .then((items) =>
          items.map((item) => ({
            updatedAt: item.updatedAt,
            path: buildListingDetailsPath({
              id: item.id,
              name: item.name,
              brand: item.brand,
              city: item.location?.city,
              country: item.location?.country,
            }),
          })),
        );
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
    return `<url><loc>${SITE_URL}${item.path}</loc><lastmod>${new Date(item.updatedAt).toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`;
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...staticEntries, ...itemEntries].join("")}</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
