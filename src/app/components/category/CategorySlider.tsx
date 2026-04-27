"use client";

import { memo, useCallback, useEffect, useMemo, type ReactNode } from "react";
import CategoryList from "./CategoryList";
import categoryFetcher from "./CategoryFetcher";
import Container from "../Container";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import type { CategoryItem, ItemType } from "./types";
import { useStaleResource } from "@/app/hooks/useStaleResource";
import Loader from "./Loader";
import Tryagain from "./Tryagain";
import { INVENTORY_INVALIDATED_EVENT } from "@/app/utils/deleteFeedback";

interface CategorySliderProps {
  type?: ItemType | null;
  setCatName: (c: string) => void;
  catName: string;
}

const CategorySlider = ({ type, setCatName, catName }: CategorySliderProps) => {
  const { isArabic } = useAppPreferences();
  const cacheKey = useMemo(
    () => `categories:${type ?? "ALL"}:with-items`,
    [type],
  );
  const fetchCategories = useCallback(
    () =>
      categoryFetcher({
        type,
        withItemsOnly: true,
      }),
    [type],
  );

  const { data, loading, refetch } = useStaleResource<CategoryItem[]>({
    cacheKey,
    fetcher: fetchCategories,
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

  const list = data ?? [];

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
      <div className="flex min-h-22 items-center justify-center">
        <Loader isArabic={isArabic} />
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
