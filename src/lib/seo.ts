import type { Metadata } from "next";

export const SITE_NAME = "Mashhoor";
export const SITE_SHORT_NAME = "Mashhoor";
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const SITE_ICON = "/images/logo.png";
export const DEFAULT_OG_IMAGE = "/opengraph-image";
export const DEFAULT_TWITTER_IMAGE = "/twitter-image";
export const SITE_DESCRIPTION =
  "Mashhoor is a marketplace to discover, rent, buy, and sell properties, cars, and other items with smart search, secure payments, and subscription benefits.";
export const SITE_TAGLINE = "Marketplace for Renting, Buying, and Selling";

export const absoluteUrl = (path: string) => {
  if (!path) return SITE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

interface BuildMetadataInput {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string[];
}

const TITLE_MAX = 60;
const TITLE_MIN = 50;
const DESC_MAX = 160;
const DESC_MIN = 140;
const BRAND = SITE_NAME;
const TITLE_TEMPLATE = "%s | " + BRAND;

function trimWithEllipsis(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function applyBrandTemplate(title: string) {
  // إذا كان العنوان يحتوي العلامة التجارية بالفعل، لا تضفها مرتين
  if (title.toLowerCase().includes(BRAND.toLowerCase())) return title;
  return TITLE_TEMPLATE.replace("%s", title);
}

export const buildMetadata = ({
  title,
  description,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
  keywords = [],
}: BuildMetadataInput): Metadata => {
  const canonical = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  // Guardrails: warn in dev, trim in prod
  let safeTitle = applyBrandTemplate(title);
  let safeDescription = description;
  if (process.env.NODE_ENV !== "production") {
    if (safeTitle.length > TITLE_MAX || safeTitle.length < TITLE_MIN) {
      console.warn(
        `[SEO] Title length (${safeTitle.length}) out of recommended range (${TITLE_MIN}-${TITLE_MAX}):`,
        safeTitle,
      );
    }
    if (description.length > DESC_MAX || description.length < DESC_MIN) {
      console.warn(
        `[SEO] Description length (${description.length}) out of recommended range (${DESC_MIN}-${DESC_MAX}):`,
        description,
      );
    }
  } else {
    safeTitle = trimWithEllipsis(safeTitle, TITLE_MAX);
    safeDescription = trimWithEllipsis(description, DESC_MAX);
  }

  return {
    title: safeTitle,
    description: safeDescription,
    keywords,
    alternates: {
      canonical,
      languages: {
        ar: canonical,
        en: canonical,
      },
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: safeTitle,
      description: safeDescription,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: safeTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: safeTitle,
      description: safeDescription,
      images: [imageUrl],
    },
  };
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: ["ar", "en"],
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(SITE_ICON),
    },
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl(SITE_ICON),
};
