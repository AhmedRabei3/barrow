"use client";

import { memo, useCallback, useEffect, useMemo, type ReactNode } from "react";
import CategoryList from "./CategoryList";
import categoryFetcher, {
  getCachedCategoriesSnapshot,
} from "./CategoryFetcher";
import Container from "../Container";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import type { CategoryItem, ItemType } from "./types";
import { useStaleResource } from "@/app/hooks/useStaleResource";
import Tryagain from "./Tryagain";
import { INVENTORY_INVALIDATED_EVENT } from "@/app/utils/deleteFeedback";
import CategorySliderSkeleton from "./CategorySliderSkeleton";
import { request } from "@/app/utils/axios";

interface CategorySliderProps {
  type?: ItemType | null;
  setCatName: (c: string) => void;
  catName: string;
}

const fetchItemTypeCounts = async (): Promise<Record<
  string,
  number
> | null> => {
  try {
    const response = await request.get("/api/items/counts", {
      timeout: 7000,
    });

    const payload = response.data as
      | { success?: boolean; counts?: Record<string, number> }
      | undefined;

    if (!payload?.success || !payload.counts) {
      return null;
    }

    return payload.counts;
  } catch {
    return null;
  }
};

const CategorySlider = ({ type, setCatName, catName }: CategorySliderProps) => {
  const { isArabic } = useAppPreferences();
  const cacheKey = useMemo(
    () => `categories:${type ?? "ALL"}:with-items`,
    [type],
  );
  const fetchCategories = useCallback(
    async (signal: AbortSignal) => {
      const categoriesWithItems = await categoryFetcher({
        type,
        withItemsOnly: true,
        signal,
      });

      if (categoriesWithItems.length > 0 || !type) {
        return categoriesWithItems;
      }

      const counts = await fetchItemTypeCounts();
      if (!counts) {
        return categoryFetcher({
          type,
          withItemsOnly: false,
          signal,
        });
      }

      if ((counts?.[type] ?? 0) <= 0) {
        return categoriesWithItems;
      }

      return categoryFetcher({
        type,
        withItemsOnly: false,
        signal,
      });
    },
    [type],
  );

  const fallbackData = useMemo(() => {
    const withItems = getCachedCategoriesSnapshot({
      type,
      withItemsOnly: true,
    });

    if (withItems?.length) {
      return withItems;
    }

    return getCachedCategoriesSnapshot({
      type,
      withItemsOnly: false,
    });
  }, [type]);

  const { data, loading, refetch } = useStaleResource<CategoryItem[]>({
    cacheKey,
    fetcher: fetchCategories,
    fallbackData,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleInventoryInvalidated = () => {
      void refetch();
    };

    const handleWindowFocus = () => {
      void refetch();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refetch();
      }
    };

    window.addEventListener(
      INVENTORY_INVALIDATED_EVENT,
      handleInventoryInvalidated,
    );
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(
        INVENTORY_INVALIDATED_EVENT,
        handleInventoryInvalidated,
      );
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch]);

  const list = useMemo(
    () =>
      (data ?? []).filter(
        (category) => !category.isDeleted && category.name.trim().length > 0,
      ),
    [data],
  );

  const shellClassName =
    "relative mt-16 overflow-hidden sm:mt-18 md:mt-36 lg:mt-40 block";

  const renderShell = (content: ReactNode) => (
    <div className={shellClassName}>
      <Container>
        <div className="relative min-h-22">{content}</div>
      </Container>
    </div>
  );

  if (loading && !list.length) {
    return renderShell(
      <div className="min-h-22 py-1">
        <CategorySliderSkeleton />
      </div>,
    );
  }

  if (!list.length) {
    return renderShell(
      <div className="flex min-h-22 items-center justify-center">
        <Tryagain isArabic={isArabic} refetch={refetch} />
      </div>,
    );
  }

  return renderShell(
    <div
      key={type}
      className="
       relative flex 
       items-center gap-4 
       transition-all 
       duration-300 
       ease-out
      "
    >
      <CategoryList list={list} setCatName={setCatName} catName={catName} />
    </div>,
  );
};

export default memo(CategorySlider);
