import { getSitemapShardMeta, getTotalSitemapShards } from "@/lib/sitemap";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const shardMeta = await getSitemapShardMeta();
  const total = getTotalSitemapShards(shardMeta);
  const now = new Date().toISOString();

  const entries = Array.from({ length: total }, (_, index) => {
    return `<sitemap><loc>${SITE_URL}/sitemap/${index}</loc><lastmod>${now}</lastmod></sitemap>`;
  }).join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
