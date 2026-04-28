"use client";

import Navbar from "./components/header/Navbar";
import CategorySlider from "./components/category/CategorySlider";
import HomeBody from "./components/home/HomeBody";
import Pagination from "./components/home/Pagination";
import useItems from "@/app/hooks/useItem";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSearchHelper } from "./hooks/useSearchHelper";
import { request } from "@/app/utils/axios";
import {
  formatRawItems,
  FormattedItem,
  RawItem,
} from "./components/home/getItems";
import { useStaleResource } from "@/app/hooks/useStaleResource";
import { useSession } from "next-auth/react";
import { updatePreferredInterestOrderAction } from "@/actions/auth.actions";
import { useAppPreferences } from "./components/providers/AppPreferencesProvider";
import { clearItemsCache } from "@/app/hooks/useItem";
import { clearCachedResourcesByPrefix } from "@/app/hooks/useStaleResource";
import {
  getOrderedPrimaryCategoryTabs,
  normalizeUserInterestOrder,
  PENDING_INTEREST_ORDER_STORAGE_KEY,
  type PrimaryCategoryKey,
} from "@/lib/primaryCategories";
import { INVENTORY_INVALIDATED_EVENT } from "@/app/utils/deleteFeedback";
import dynamic from "next/dynamic";

const SiteFooter = dynamic(() =>
  import("./components/footer/SiteFooter.tsx").then((m) => m.default),
);
const MobileCategoryPicker = dynamic(
  () =>
    import("./components/home/MobileCategoryPicker.tsx").then((m) => m.default),
  { ssr: false },
);
const FloatingActionMenu = dynamic(
  () => import("./components/FloatingActionMenu.tsx").then((m) => m.default),
  { ssr: false },
);

const HomePageClient = () => {
  const { filters } = useSearchFilters();
  const [currentPage, setCurrentPage] = useState(1);
  const { data: session, status, update } = useSession();
  const { isArabic } = useAppPreferences();
  const limit = 24;

  /* ── Mobile category picker state ──────────────────────────────── */
  const [isMobile, setIsMobile] = useState(false);
  const [mobileCategoryPicked, setMobileCategoryPicked] = useState(false);
  const [skipPicker, setSkipPicker] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Skip the picker when:
    // 1. URL already has explicit filters (shared link)
    // 2. Zustand store already has a type set (user navigated back)
    // 3. sessionStorage remembers the user already picked
    const params = new URLSearchParams(window.location.search);
    const storeType = useSearchFilters.getState().filters.type;
    const alreadyPicked =
      sessionStorage.getItem("mobile-category-picked") === "1";

    if (
      params.has("type") ||
      params.has("q") ||
      params.has("catName") ||
      params.has("city") ||
      storeType != null ||
      alreadyPicked
    ) {
      setSkipPicker(true);
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const showPicker = isMobile && !mobileCategoryPicked && !skipPicker;

  const handleMobileBack = useCallback(() => {
    setMobileCategoryPicked(false);
    sessionStorage.removeItem("mobile-category-picked");
  }, []);
  const { items, totalItems, loading, isRefreshing, refetch } = useItems({
    page: currentPage,
    limit,
  });
  const helper = useSearchHelper(setCurrentPage);

  const handleMobilePick = useCallback(
    (key: PrimaryCategoryKey) => {
      helper.handleSelectPrimaryTab(key);
      setMobileCategoryPicked(true);
      sessionStorage.setItem("mobile-category-picked", "1");
    },
    [helper],
  );
  const orderedTabs = useMemo(
    () => getOrderedPrimaryCategoryTabs(session?.user?.preferredInterestOrder),
    [session?.user?.preferredInterestOrder],
  );
  const minPrice = useMemo(
    () =>
      typeof filters.minPrice === "string"
        ? Number(filters.minPrice)
        : filters.minPrice,
    [filters.minPrice],
  );
  const maxPrice = useMemo(
    () =>
      typeof filters.maxPrice === "string"
        ? Number(filters.maxPrice)
        : filters.maxPrice,
    [filters.maxPrice],
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);
  const fetchFeaturedItems = useCallback(async (signal: AbortSignal) => {
    try {
      const { data } = await request.get("/api/items/featured?limit=8", {
        timeout: 8000,
        signal,
      });

      if (!data?.success) {
        return [];
      }

      return formatRawItems((data.items || []) as RawItem[]);
    } catch (error: unknown) {
      const isAbortLikeError =
        signal.aborted ||
        (error instanceof Error &&
          (error.name === "AbortError" ||
            error.name === "CanceledError" ||
            error.name === "TimeoutError" ||
            error.message === "canceled"));

      if (!isAbortLikeError && process.env.NODE_ENV === "development") {
        console.warn("Failed to fetch featured items", error);
      }

      return [];
    }
  }, []);

  const paginationVisible = totalItems > limit;

  const { data: featuredItems, refetch: refetchFeaturedItems } =
    useStaleResource<FormattedItem[]>({
      cacheKey: "items:featured:top-8",
      fetcher: fetchFeaturedItems,
    });

  const hasExplicitFilters =
    filters.type !== undefined ||
    filters.catName !== "All" ||
    Boolean(filters.q) ||
    Boolean(filters.city) ||
    Boolean(filters.action) ||
    Boolean(filters.minPrice) ||
    Boolean(filters.maxPrice);

  useEffect(() => {
    if (status === "loading" || hasExplicitFilters || !orderedTabs[0]) {
      return;
    }

    helper.handleSelectPrimaryTab(orderedTabs[0].key);
  }, [hasExplicitFilters, helper, orderedTabs, status]);

  useEffect(() => {
    if (typeof window === "undefined" || status !== "authenticated") {
      return;
    }

    const rawValue = window.localStorage.getItem(
      PENDING_INTEREST_ORDER_STORAGE_KEY,
    );
    if (!rawValue) {
      return;
    }

    try {
      const parsed = JSON.parse(rawValue);
      const pendingOrder = normalizeUserInterestOrder(
        Array.isArray(parsed) ? parsed.map(String) : [],
      );
      const currentOrder = Array.isArray(session?.user?.preferredInterestOrder)
        ? session.user.preferredInterestOrder
        : [];

      if (currentOrder.length > 0) {
        const normalizedCurrent = normalizeUserInterestOrder(currentOrder);
        if (normalizedCurrent.join("|") === pendingOrder.join("|")) {
          window.localStorage.removeItem(PENDING_INTEREST_ORDER_STORAGE_KEY);
        }
        return;
      }

      void updatePreferredInterestOrderAction(pendingOrder, isArabic).then(
        async (result) => {
          if (result.success) {
            window.localStorage.removeItem(PENDING_INTEREST_ORDER_STORAGE_KEY);
            await update();
          }
        },
      );
    } catch {
      window.localStorage.removeItem(PENDING_INTEREST_ORDER_STORAGE_KEY);
    }
  }, [isArabic, session?.user?.preferredInterestOrder, status, update]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleInventoryInvalidated = () => {
      clearItemsCache();
      clearCachedResourcesByPrefix("items:featured:");
      void refetch();
      void refetchFeaturedItems();
    };

    window.addEventListener(
      INVENTORY_INVALIDATED_EVENT,
      handleInventoryInvalidated,
    );

    return () => {
      window.removeEventListener(
        INVENTORY_INVALIDATED_EVENT,
        handleInventoryInvalidated,
      );
    };
  }, [refetch, refetchFeaturedItems]);

  return (
    <div>
      {/*
       * Content is ALWAYS mounted so card images start preloading immediately,
       * even while the mobile picker overlay is visible. This is the key fix for
       * LCP on mobile (was 12.3 s because AnimatePresence removed content from
       * DOM while picker was shown, preventing image preloading).
       */}
      <Navbar
        handleSetType={helper.handleSetType}
        type={filters.type}
        catName={filters.catName}
        q={filters.q}
        setQ={helper.handleSearch}
        sellOrRent={filters.action}
        handelSellOrRent={helper.handleAction}
        handleSetMinPrice={helper.handleSetMinPrice}
        handleSetMaxPrice={helper.handleSetMaxPrice}
        minPrice={minPrice}
        maxPrice={maxPrice}
      />
      <CategorySlider
        type={filters.type}
        catName={filters.catName}
        setCatName={helper.handleSetCatName}
      />

      <HomeBody
        items={items}
        featuredItems={featuredItems}
        loading={loading}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {paginationVisible && (
        <Pagination
          itemsCount={totalItems}
          itemsPerPage={limit}
          currentPage={currentPage}
          setPage={helper.handleSetPage}
          maxPagesToShow={10}
        />
      )}

      <SiteFooter />

      {/*
       * Mobile category picker – rendered as a fixed overlay so the content
       * above stays in the DOM (images keep preloading in the background).
       */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ animation: "barrow-fade-in 0.22s ease forwards" }}
        >
          <MobileCategoryPicker onPick={handleMobilePick} />
        </div>
      )}

      {/* Floating Action Menu – mobile only, shown after category is picked */}
      {isMobile && mobileCategoryPicked && (
        <FloatingActionMenu
          onCategories={handleMobileBack}
          categoriesEnabled={true}
        />
      )}
    </div>
  );
};

export default HomePageClient;
