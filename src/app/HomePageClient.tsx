"use client";

import Navbar from "./components/header/Navbar";
import CategorySlider from "./components/category/CategorySlider";
import HomeBody from "./components/home/HomeBody";
import Pagination from "./components/home/Pagination";
import SiteFooter from "./components/footer/SiteFooter";
import useItems from "@/app/hooks/useItem";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";
import { useCallback, useMemo, useState } from "react";
import { useSearchHelper } from "./hooks/useSearchHelper";
import { request } from "@/app/utils/axios";
import {
  formatRawItems,
  FormattedItem,
  RawItem,
} from "./components/home/getItems";
import { useStaleResource } from "@/app/hooks/useStaleResource";

const HomePageClient = () => {
  const { filters } = useSearchFilters();
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 50;
  const { items, totalItems, loading, isRefreshing, refetch } = useItems({
    page: currentPage,
    limit,
  });
  const helper = useSearchHelper(setCurrentPage);
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

  const { data: featuredItems } = useStaleResource<FormattedItem[]>({
    cacheKey: "items:featured:top-8",
    fetcher: fetchFeaturedItems,
  });

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
