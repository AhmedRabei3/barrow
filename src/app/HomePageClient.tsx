"use client";

import Navbar from "./components/header/Navbar";
import CategorySlider from "./components/category/CategorySlider";
import HomeBody from "./components/home/HomeBody";
import Pagination from "./components/home/Pagination";
import SiteFooter from "./components/footer/SiteFooter";
import useItems from "@/app/hooks/useItem";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";
import { useEffect, useState } from "react";
import { useSearchHelper } from "./hooks/useSearchHelper";
import { request } from "@/app/utils/axios";
import {
  formatRawItems,
  FormattedItem,
  RawItem,
} from "./components/home/getItems";

const HomePageClient = () => {
  const { filters } = useSearchFilters();
  const [currentPage, setCurrentPage] = useState(1);
  const [featuredItems, setFeaturedItems] = useState<FormattedItem[]>([]);
  const limit = 50;
  const { items, totalItems, loading, refetch } = useItems({
    page: currentPage,
    limit,
  });
  const helper = useSearchHelper(setCurrentPage);

  useEffect(() => {
    let cancelled = false;

    const loadFeaturedItems = async () => {
      try {
        const { data } = await request.get("/api/items/featured?limit=8", {
          timeout: 20000,
        });

        if (cancelled || !data?.success) {
          return;
        }

        setFeaturedItems(formatRawItems((data.items || []) as RawItem[]));
      } catch {
        if (!cancelled) {
          setFeaturedItems([]);
        }
      }
    };

    loadFeaturedItems();

    return () => {
      cancelled = true;
    };
  }, []);

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
        minPrice={
          typeof filters.minPrice === "string"
            ? Number(filters.minPrice)
            : filters.minPrice
        }
        maxPrice={
          typeof filters.maxPrice === "string"
            ? Number(filters.maxPrice)
            : filters.maxPrice
        }
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
        onRefresh={refetch}
      />

      {totalItems > limit && (
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
