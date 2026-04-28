import "./globals.css";
import type { Metadata, Viewport } from "next";
import { headers, cookies } from "next/headers";
import { Geist, Geist_Mono, Noto_Kufi_Arabic } from "next/font/google";
import ClientOnly from "./components/ClientOnly";
import GlobalOverlays from "./components/GlobalOverlays";

import { SessionProvider } from "next-auth/react";

import {
  SITE_DESCRIPTION,
  SITE_TAGLINE,
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  DEFAULT_TWITTER_IMAGE,
  SITE_ICON,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import AppPreferencesProvider from "./components/providers/AppPreferencesProvider";
import AppToaster from "./components/providers/AppToaster";
//import WebVitalsReporter from "./components/analytics/WebVitalsReporter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "optional",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "optional",
});

const notoKufiArabic = Noto_Kufi_Arabic({
  variable: "--font-noto-kufi",
  subsets: ["arabic"],
  display: "optional",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  manifest: "/manifest.webmanifest",
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "rent anything",
    "marketplace",
    "rent and sell",
    "properties",
    "cars",
    "classifieds",
    "إيجار",
    "بيع وشراء",
    "عقارات",
    "سيارات",
  ],
  alternates: {
    canonical: "/",
    languages: {
      ar: "/",
      en: "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description:
      "Discover and list properties, cars, and more with secure checkout, smart search, and referral-powered growth.",
    locale: "en_US",
    alternateLocale: ["ar"],
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description:
      "Discover and list properties, cars, and more with secure checkout and smart search.",
    images: [DEFAULT_TWITTER_IMAGE],
  },
  icons: {
    icon: SITE_ICON,
    apple: SITE_ICON,
  },
};

/* eslint-disable @next/next/no-page-custom-font */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const acceptLanguage = (await headers()).get("accept-language") ?? "";
  const cookieStore = await cookies();
  const savedLocaleCookie = cookieStore.get("barrow-locale")?.value;
  const initialLocale =
    savedLocaleCookie === "ar" || savedLocaleCookie === "en"
      ? savedLocaleCookie
      : acceptLanguage.toLowerCase().startsWith("ar")
        ? "ar"
        : "en";

  return (
    <html
      lang={initialLocale}
      dir={initialLocale === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <head>
        {/* Critical resource hints for performance */}
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link
          rel="preconnect"
          href="https://res.cloudinary.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://nominatim.openstreetmap.org" />

        {/* Preload critical resources for LCP optimization */}
        <link
          rel="preload"
          as="image"
          href="/images/logo.png"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="font"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=optional"
          crossOrigin="anonymous"
        />

        {/* Async CSS loading to reduce render-blocking */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', () => {
                const linkTags = document.querySelectorAll('link[data-async="true"]');
                linkTags.forEach(link => {
                  link.media = 'all';
                });
              });
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoKufiArabic.variable} antialiased bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors`}
      >
        <AppPreferencesProvider initialLocale={initialLocale}>
          <SessionProvider refetchOnWindowFocus={false}>
            <ClientOnly>
              <GlobalOverlays />
              {/* <WebVitalsReporter /> */}
              <AppToaster />
            </ClientOnly>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify([websiteJsonLd, organizationJsonLd]),
              }}
            />
            <main id="main-content">{children}</main>
          </SessionProvider>
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
/* eslint-enable @next/next/no-page-custom-font */
