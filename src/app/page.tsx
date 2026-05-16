import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";
import { buildMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";
import { searchItemsUncached } from "@/server/services/item-search.service";
import type { ItemSearchItemDto } from "@/features/items/types";

// ISR: re-render at most once every 5 minutes
export const revalidate = 300;
export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: `${SITE_NAME} | Home Marketplace for Property, Cars, and Rentals | الرئيسية لبيع وشراء العقارات والسيارات والإيجار`,
    description:
      "Discover trusted listings for properties, cars, furniture, and medical devices with smart search, direct contact, and seamless rent, buy, and sell on Mashhoor. اكتشف آلاف الإعلانات الموثوقة للعقارات والسيارات والأثاث والأجهزة الطبية، مع بحث ذكي وتواصل مباشر وخيارات بيع وشراء وإيجار بأسعار تنافسية على Mashhoor.",
    path: "/",
    keywords: [
      "marketplace home",
      "rent and buy",
      "listings",
      "rent platform",
      "عقارات للبيع والإيجار",
      "منصة بيع وتأجير",
    ],
  });
}

const collectionPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `${SITE_NAME} Home`,
  url: SITE_URL,
  description:
    "Main marketplace page for discovering properties, cars, and multi-category listings.",
};

const homeWebPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `${SITE_NAME} | Home`,
  url: SITE_URL,
  inLanguage: ["en", "ar"],
  isPartOf: {
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
    ],
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default async function Page() {
  // Fetch initial items server-side (runs at build time + every 5 min via ISR).
  // This eliminates the client-side loading skeleton on first visit.
  let initialItems: ItemSearchItemDto[] = [];
  try {
    // Use searchItemsUncached (not searchItems) so we skip Next.js's internal
    // unstable_cache Data Cache layer, which uses AbortSignal.timeout() internally
    // and throws unhandled TimeoutErrors when Supabase is slow.
    // The ISR revalidate=300 on this page itself is the caching mechanism.
    const result = await searchItemsUncached({
      q: "",
      type: null,
      page: 1,
      limit: 20,
      userLat: null,
      userLng: null,
    });
    initialItems = result.items;
  } catch {
    // Non-fatal: client will fetch on mount if empty
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([collectionPageJsonLd, homeWebPageJsonLd]),
        }}
      />
      <HomePageClient initialItems={initialItems} />
    </>
  );
}
