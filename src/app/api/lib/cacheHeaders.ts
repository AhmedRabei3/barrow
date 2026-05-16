export const CACHE_HEADERS = {
  publicShort: "public, s-maxage=30, stale-while-revalidate=300",
  publicMedium: "public, s-maxage=120, stale-while-revalidate=600",
  publicStandard: "public, s-maxage=300, stale-while-revalidate=600",
  publicLong: "public, s-maxage=600, stale-while-revalidate=3600",
  privateNoStore: "private, no-store",
  noStore: "no-store",
} as const;
