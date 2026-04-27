"use client";

import Navbar from "./components/header/Navbar";
import CategorySlider from "./components/category/CategorySlider";
import HomeBody from "./components/home/HomeBody";
import Pagination from "./components/home/Pagination";
import SiteFooter from "./components/footer/SiteFooter";
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
} from "@/lib/primaryCategories";
import { INVENTORY_INVALIDATED_EVENT } from "@/app/utils/deleteFeedback";

const HomePageClient = () => {
  const { filters } = useSearchFilters();
  const [currentPage, setCurrentPage] = useState(1);
  const { data: session, status, update } = useSession();
  const { isArabic } = useAppPreferences();
  const limit = 24;
  const { items, totalItems, loading, isRefreshing, refetch } = useItems({
    page: currentPage,
    limit,
  });
  const helper = useSearchHelper(setCurrentPage);
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
  const fetchFeaturedItems = useCallback(async () => {
    const { data } = await request.get("/api/items/featured?limit=8", {
      timeout: 8000,
    });

    if (!data?.success) {
      return [];
    }

    return formatRawItems((data.items || []) as RawItem[]);
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
        featuredItems={featuredItems ?? []}
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
    </div>
  );
};

export default HomePageClient;
