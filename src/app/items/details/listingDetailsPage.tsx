import type { Metadata } from "next";
import { headers } from "next/headers";
import ItemDetails from "./[id]/ItemDetails";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import {
  getListingDetailsById,
  type ListingDetailsDto,
} from "@/server/services/listing-details.service";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const getListingOrNull = async (id: string) => getListingDetailsById(id);

export const buildListingMetadata = (
  id: string,
  item: ListingDetailsDto | null,
): Metadata => {
  if (!item?.data) {
    return {
      title: "Item not found",
      robots: { index: false, follow: false },
    };
  }

  const title = item.title || "Item details";
  const priceText =
    typeof item.data.price === "number" ? ` - ${item.data.price}$` : "";
  const locationText = item.location
    ? `${item.location.city}, ${item.location.country}`
    : "";

  const description = `${title}${priceText}${locationText ? ` | ${locationText}` : ""} - ${SITE_NAME} marketplace listing details.`;
  const ogDynamicImageUrl = `${SITE_URL}/items/details/${id}/opengraph-image`;
  const twitterDynamicImageUrl = `${SITE_URL}/items/details/${id}/twitter-image`;

  return {
    title,
    description,
    alternates: {
      canonical: item.canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(item.canonicalPath),
      type: "website",
      images: [
        {
          url: ogDynamicImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
        ...(item.images?.[0]?.url
          ? [
              {
                url: item.images[0].url,
                width: 1200,
                height: 630,
                alt: title,
              },
            ]
          : []),
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        twitterDynamicImageUrl,
        ...(item.images?.[0]?.url ? [item.images[0].url] : []),
      ],
    },
  };
};

export const renderListingDetailsPage = async (
  item: ListingDetailsDto | null,
) => {
  const acceptLanguage = (await headers()).get("accept-language") ?? "";
  const isArabic = acceptLanguage.toLowerCase().startsWith("ar");

  const listingTitle = item?.title || "Listing";

  const listingSchema = item
    ? (() => {
        const itemUrl = absoluteUrl(item.canonicalPath);
        const itemImages =
          item.images?.map((image: { url: string }) =>
            absoluteUrl(image.url),
          ) || [];
        const locationText = [item.location?.city, item.location?.country]
          .filter(Boolean)
          .join(", ");
        const hasPrice = typeof item.data?.price === "number";

        const productJsonLd = {
          "@context": "https://schema.org",
          "@type": "Product",
          "@id": `${itemUrl}#product`,
          url: itemUrl,
          sku: item.data.id,
          name: listingTitle,
          image: itemImages,
          description: `${listingTitle} listing on ${SITE_NAME} marketplace${locationText ? ` in ${locationText}` : ""}`,
          brand: item.data?.brand
            ? {
                "@type": "Brand",
                name: item.data.brand,
              }
            : undefined,
          category: item.category?.name || undefined,
          aggregateRating:
            typeof item.averageRating === "number" &&
            typeof item.reviewsCount === "number" &&
            item.reviewsCount > 0
              ? {
                  "@type": "AggregateRating",
                  ratingValue: item.averageRating,
                  reviewCount: item.reviewsCount,
                }
              : undefined,
          offers: hasPrice
            ? {
                "@type": "Offer",
                priceCurrency: "USD",
                price: item.data.price,
                availability: "https://schema.org/InStock",
                url: itemUrl,
                itemCondition: "https://schema.org/UsedCondition",
                seller: {
                  "@type": "Organization",
                  name: SITE_NAME,
                },
              }
            : undefined,
          areaServed: item.location?.country
            ? {
                "@type": "Country",
                name: item.location.country,
              }
            : undefined,
        };

        const breadcrumbJsonLd = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: absoluteUrl("/"),
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Items",
              item: absoluteUrl("/"),
            },
            {
              "@type": "ListItem",
              position: 3,
              name: listingTitle,
              item: itemUrl,
            },
          ],
        };

        const webPageJsonLd = {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${itemUrl}#webpage`,
          url: itemUrl,
          name: listingTitle,
          description: `${listingTitle} item details page on ${SITE_NAME}`,
          isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: absoluteUrl("/"),
          },
          breadcrumb: {
            "@id": `${itemUrl}#breadcrumb`,
          },
          primaryImageOfPage: itemImages[0]
            ? {
                "@type": "ImageObject",
                url: itemImages[0],
              }
            : undefined,
        };

        return [
          productJsonLd,
          {
            ...breadcrumbJsonLd,
            "@id": `${itemUrl}#breadcrumb`,
          },
          webPageJsonLd,
        ];
      })()
    : null;

  return (
    <>
      {listingSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(listingSchema) }}
        />
      )}
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        {item ? (
          <div className="rounded-[30px] border border-slate-200/70 bg-linear-to-br from-white/96 via-white to-slate-50/95 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-slate-700/70 dark:from-slate-900/95 dark:via-slate-900 dark:to-slate-950/95">
            <ItemDetails item={item} />
          </div>
        ) : (
          <div className="market-panel rounded-[28px] px-6 py-12 text-center text-slate-200">
            <h2 className="text-xl font-bold">
              {isArabic ? "غير موجود" : "Not Found"}
            </h2>
          </div>
        )}
      </div>
    </>
  );
};
