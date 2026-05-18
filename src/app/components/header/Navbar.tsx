"use client";

import {
  Suspense,
  lazy,
  type ComponentType,
  useState,
  useEffect,
  useCallback,
  memo,
} from "react";
import Container from "../Container";
import Logo from "./Logo";
import { usePathname } from "next/navigation";
import HomeTabs from "../home/HomeTabs";
import { $Enums } from "@prisma/client";
import useScrollDirection from "@/app/hooks/useScrollDirection";
import SearchBar from "./search-box/SearchBar";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import ChatBadge from "../chat/ChatBadge";
import { BiSearch } from "react-icons/bi";
import { MdMyLocation } from "react-icons/md";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { useSearchHelper } from "../../hooks/useSearchHelper";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";

/* ─── Mobile search input ──────────────────────────────────────────────── */

function MobileSearchInput({
  q,
  setQ,
  isArabic,
}: {
  q: string;
  setQ: (v: string) => void;
  isArabic: boolean;
}) {
  const [local, setLocal] = useState(q);

  useEffect(() => {
    setLocal(q);
  }, [q]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (local !== q) setQ(local);
    }, 250);
    return () => window.clearTimeout(id);
  }, [local, q, setQ]);

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 shadow-[0_1px_8px_rgba(0,0,0,0.07)] transition-shadow focus-within:shadow-[0_2px_14px_rgba(0,0,0,0.12)]"
    >
      <BiSearch size={15} className="shrink-0 text-slate-400" />
      <input
        type="text"
        name="mobileSearchQuery"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={isArabic ? "ابحث..." : "Search..."}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-700 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}

const UserMenu = lazy(async () => {
  const importedModule = await import("./UserMenu.lazy.js");

  return {
    default: importedModule.default as unknown as ComponentType,
  };
});

const NotificationBell = lazy(async () => {
  const importedModule =
    await import("../notification/NotificationBell.lazy.js");

  return {
    default: importedModule.default as unknown as ComponentType<{
      hiddenWhenEmpty?: boolean;
    }>,
  };
});

const ICON_BUTTON_SKELETON_CLASS =
  "h-9 w-9 rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800";

const USER_MENU_SKELETON_CLASS =
  "h-11 w-[4.5rem] rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800";

const TOP_BAR_CLASS =
  "fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-950/90";

const DESKTOP_GRID_CLASS =
  "hidden lg:grid grid-cols-[minmax(0,1fr)_minmax(28rem,42rem)_minmax(0,1fr)] items-center gap-4 px-1 py-2";

const MOBILE_GRID_CLASS =
  "lg:hidden grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-1 py-2.5";

const TABLET_SEARCH_CLASS = "hidden md:block lg:hidden px-1 pb-2";

const TABS_ROW_CLASS =
  "hidden md:flex w-full justify-center overflow-hidden pb-1";

interface NavbarProps {
  handleSetType: (t: $Enums.ItemType) => void;
  type: $Enums.ItemType | undefined;
  catName: string;
  q: string;
  setQ: (q: string) => void;
  handelSellOrRent: (t: $Enums.TransactionType) => void;
  sellOrRent: $Enums.TransactionType | undefined;
  handleSetMinPrice?: (min: number) => void;
  handleSetMaxPrice?: (max: number) => void;
  minPrice?: number;
  maxPrice?: number;
  isFiltering?: boolean;
}

const Navbar = ({
  type,
  catName,
  setQ,
  q,
  sellOrRent,
  minPrice,
  maxPrice,
  isFiltering = false,
}: NavbarProps) => {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");
  const scrollDir = useScrollDirection();
  const { filters } = useSearchFilters();
  const hasUserLocation = filters.userLat !== null && filters.userLng !== null;
  const { isArabic } = useAppPreferences();

  const [isScrolled, setIsScrolled] = useState(false);
  const helper = useSearchHelper();

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        const next = window.scrollY > 40;
        setIsScrolled((prev) => (prev === next ? prev : next));
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const host = window.location.hostname;
    const isLocalhost =
      host === "localhost" || host === "127.0.0.1" || host === "[::1]";

    if (isLocalhost) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) => registration.unregister()),
          ),
        )
        .catch(() => {
          // Ignore cleanup failures on local development.
        });

      if ("caches" in window) {
        void caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => {
            // Ignore cache cleanup failures on local development.
          });
      }

      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Keep silent to avoid noisy console in unsupported/private contexts.
    });
  }, []);

  // ✅ Define React Hooks before conditional returns
  const openNearbyItems = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-nearby-items"));
  }, []);

  const nearbyTooltip = hasUserLocation
    ? isArabic
      ? "أنقر هنا لإعادة تحديد موقعك وترتيب العناصر حسب قربها منك"
      : "Click here to update your location and sort items by proximity"
    : isArabic
      ? "أنقر هنا لتحديد موقعك وترتيب العناصر حسب قربها منك"
      : "Click here to pick your location and sort items by proximity";

  if (isAdminPage) return null;

  const topBarStyle = {
    transform: `translateY(${scrollDir === "down" ? "-4px" : "0px"})`,
    boxShadow: isScrolled
      ? "0 4px 14px rgba(15,23,42,0.09)"
      : "0 0 0 rgba(0,0,0,0)",
  };

  const collapsibleStyle = {
    opacity: scrollDir === "down" ? 0 : 1,
    transform: `translateY(${scrollDir === "down" ? "-15px" : "0px"})`,
    pointerEvents: scrollDir === "down" ? "none" : "auto",
  } as const;

  const tabsStyle = {
    opacity: scrollDir === "down" ? 0 : 1,
    transform: `translateY(${scrollDir === "down" ? "-8px" : "0px"})`,
    /*
     * Use max-height instead of height: 0 ↔ "auto".
     * Animating `height` between 0 and "auto" forces layout reflow on every
     * frame (contributing to TBT). max-height with overflow:hidden is handled
     * by the compositor and avoids triggering layout.
     */
    maxHeight: scrollDir === "down" ? 0 : "200px",
    overflow: "hidden" as const,
    pointerEvents: scrollDir === "down" ? "none" : "auto",
  } as const;

  return (
    <div className={TOP_BAR_CLASS} style={topBarStyle}>
      <Container>
        <div dir="ltr" className={DESKTOP_GRID_CLASS}>
          <div className="flex items-center gap-2 min-w-0 shrink-0 justify-self-start">
            <Logo />
            <div className="group relative hidden lg:block">
              <button
                type="button"
                onClick={openNearbyItems}
                aria-label={nearbyTooltip}
                title={nearbyTooltip}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sky-600 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:border-sky-700 dark:hover:bg-sky-950/40"
              >
                <MdMyLocation size={18} />
              </button>
              <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-64 -translate-x-1/2 rounded-2xl border border-sky-200 bg-white/95 px-3 py-2 text-center text-[12px] font-medium leading-5 text-slate-700 shadow-lg backdrop-blur group-hover:block dark:border-sky-800/60 dark:bg-slate-900/95 dark:text-slate-200">
                {nearbyTooltip}
              </div>
            </div>
          </div>

          <div className="justify-self-center w-full min-w-0">
            <SearchBar
              category={catName}
              setQ={setQ}
              q={q}
              sellOrRent={sellOrRent}
              handelSellOrRent={helper.handleAction}
              handleSetMinPrice={helper.handleSetMinPrice}
              handleSetMaxPrice={helper.handleSetMaxPrice}
              minPrice={minPrice}
              maxPrice={maxPrice}
            />
          </div>

          <div className="flex items-center justify-end gap-2 min-w-0 justify-self-end">
            <div className="hidden lg:flex items-center gap-2">
              <Suspense
                fallback={<div className={ICON_BUTTON_SKELETON_CLASS} />}
              >
                <NotificationBell />
              </Suspense>
              <ChatBadge />
              <ThemeToggle />
            </div>
            <LanguageToggle />
            <div className="shrink-0">
              <Suspense fallback={<div className={USER_MENU_SKELETON_CLASS} />}>
                <UserMenu />
              </Suspense>
            </div>
          </div>
        </div>

        <div dir="ltr" className={MOBILE_GRID_CLASS}>
          <div className="flex items-center justify-center">
            <Logo />
          </div>
          <div className="min-w-0 px-1 md:hidden">
            <MobileSearchInput q={q} setQ={setQ} isArabic={isArabic} />
          </div>
          <div className="flex items-center justify-end gap-1">
            <Suspense fallback={null}>
              <NotificationBell hiddenWhenEmpty />
            </Suspense>
            <ChatBadge />
            <Suspense fallback={<div className={USER_MENU_SKELETON_CLASS} />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>

        <div
          className={`${TABLET_SEARCH_CLASS} transition-all duration-300 ease-in-out`}
          style={collapsibleStyle}
        >
          <SearchBar
            category={catName}
            setQ={setQ}
            q={q}
            sellOrRent={sellOrRent}
            handelSellOrRent={helper.handleAction}
            handleSetMinPrice={helper.handleSetMinPrice}
            handleSetMaxPrice={helper.handleSetMaxPrice}
            minPrice={minPrice}
            maxPrice={maxPrice}
          />
        </div>

        <div
          className={`${TABS_ROW_CLASS} overflow-hidden transition-all duration-300 ease-in-out`}
          style={tabsStyle}
        >
          <HomeTabs
            onSelectTab={helper.handleSelectPrimaryTab}
            type={type}
            isFiltering={isFiltering}
          />
        </div>
      </Container>
    </div>
  );
};

export default memo(Navbar);
