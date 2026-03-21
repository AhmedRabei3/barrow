import type { Metadata } from "next";
import { headers } from "next/headers";
import HomePageClient from "./HomePageClient";
import { absoluteUrl, buildMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const acceptLanguage = (await headers()).get("accept-language") ?? "";
  const isArabic = acceptLanguage.toLowerCase().startsWith("ar");

  return buildMetadata({
    title: isArabic ? `${SITE_NAME} | الرئيسية` : `${SITE_NAME} | Home`,
    description: isArabic
      ? "اعثر على عقارات وسيارات وعناصر موثقة للبيع أو الإيجار مع فلاتر ذكية ودفعات آمنة وتجربة سوق احترافية."
      : "Find verified properties, cars, and listings for rent or sale with smart filters, secure payments, and high-converting marketplace tools.",
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
  primaryImageOfPage: {
    "@type": "ImageObject",
    url: absoluteUrl("/images/logo.png"),
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([collectionPageJsonLd, homeWebPageJsonLd]),
        }}
      />
      <HomePageClient />
    </>
  );
}
