import { $Enums } from "@prisma/client";
import { startTransition, useCallback } from "react";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";
import {
  getPrimaryCategoryFilters,
  type PrimaryCategoryKey,
} from "@/lib/primaryCategories";

export const useSearchHelper = (setCurrentPage?: (page: number) => void) => {
  const { setFilters } = useSearchFilters();

  const update = useCallback(
    (data: Partial<Parameters<typeof setFilters>[0]>) => {
      startTransition(() => {
        setFilters(data);
        if (setCurrentPage) setCurrentPage(1);
      });
    },
    [setFilters, setCurrentPage],
  );

  const handleSetType = useCallback(
    (type: $Enums.ItemType) => {
      update({ type, catName: "All" });
    },
    [update],
  );

  const handleSelectPrimaryTab = useCallback(
    (key: PrimaryCategoryKey) => {
      update(getPrimaryCategoryFilters(key));
    },
    [update],
  );

  const handleSetMinPrice = useCallback(
    (minPrice: string | number | null | undefined) => {
      if (minPrice === 0 || minPrice === undefined || minPrice === null)
        minPrice = "";
      update({ minPrice });
    },
    [update],
  );

  const handleSetMaxPrice = useCallback(
    (maxPrice: string | number | null | undefined) => {
      if (maxPrice === 0 || maxPrice === undefined || maxPrice === null)
        maxPrice = "";
      update({ maxPrice });
    },
    [update],
  );

  const handleSetCity = useCallback(
    (city: string) => {
      update({ city });
    },
    [update],
  );

  const handleSetCatName = useCallback(
    (catName: string) => {
      update({ catName });
    },
    [update],
  );

  const handleSearch = useCallback(
    (q: string) => {
      update({ q });
    },
    [update],
  );

  const handleAction = useCallback(
    (action?: $Enums.TransactionType) => {
      update({ action });
    },
    [update],
  );

  const handleSetPage = useCallback(
    (page: number) => {
      if (setCurrentPage) setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setCurrentPage],
  );

  return {
    handleSetType,
    handleSelectPrimaryTab,
    handleSetMinPrice,
    handleSetMaxPrice,
    handleSetCity,
    handleSetCatName,
    handleSearch,
    handleAction,
    handleSetPage,
  };
};
