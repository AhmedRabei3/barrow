import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Noto_Kufi_Arabic } from "next/font/google";
import "./globals.css";
import ClientOnly from "./components/ClientOnly";
import "leaflet/dist/leaflet.css";

import { Toaster } from "react-hot-toast";
import { SessionProvider } from "next-auth/react";
import LoginModal from "./components/modals/LoginModal";
import RegisterModal from "./components/modals/RegisterModal";
import ReferralHandler from "./components/modals/referalCatcher/ReferralHandler";
import ActivationModal from "./components/modals/ActivationModal";
import Countdown from "./components/countdown/Countdown";
import InviteModal from "./components/modals/inviteModal/InviteModal";
import SearchModal from "./components/modals/searchModal/SearchModal";
import FloatingChatButton from "./components/FloatingChatButton";
import ScrollToTopButton from "./components/ScrollToTopButton";
import ChunkErrorRecovery from "./components/ChunkErrorRecovery";
import AppPreferencesProvider from "./components/providers/AppPreferencesProvider";
import WebVitalsReporter from "./components/analytics/WebVitalsReporter";
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoKufiArabic = Noto_Kufi_Arabic({
  variable: "--font-noto-kufi",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Marketplace for Renting, Buying, and Selling`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Rent Anything is a marketplace to discover, rent, buy, and sell properties, cars, and other items with smart search, secure payments, and subscription benefits.",
  applicationName: "Rent Anything",
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
    siteName: "Rent Anything",
    title: "Rent Anything | Marketplace for Renting, Buying, and Selling",
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
    title: "Rent Anything | Marketplace for Renting, Buying, and Selling",
    description:
      "Discover and list properties, cars, and more with secure checkout and smart search.",
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: DEFAULT_OG_IMAGE,
    apple: DEFAULT_OG_IMAGE,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const acceptLanguage = (await headers()).get("accept-language") ?? "";
  const initialLocale = acceptLanguage.toLowerCase().startsWith("ar")
    ? "ar"
    : "en";

  return (
    <html
      lang={initialLocale}
      dir={initialLocale === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoKufiArabic.variable} antialiased p-2 bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors`}
      >
        <AppPreferencesProvider initialLocale={initialLocale}>
          <SessionProvider refetchOnWindowFocus={false}>
            <ClientOnly>
              <ChunkErrorRecovery />
              <WebVitalsReporter />
              <ReferralHandler />
              <Toaster />
              <LoginModal />
              <InviteModal />
              <RegisterModal />
              <FloatingChatButton />
              <ScrollToTopButton />
              <SearchModal />
              <ActivationModal />
              <Countdown />
            </ClientOnly>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify([websiteJsonLd, organizationJsonLd]),
              }}
            />
            {children}
          </SessionProvider>
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
