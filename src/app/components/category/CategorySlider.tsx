"use client";

import { memo, useCallback, useMemo } from "react";
import CategoryList from "./CategoryList";
import categoryFetcher from "./CategoryFetcher";
import Container from "../Container";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import type { CategoryItem, ItemType } from "./types";
import { useStaleResource } from "@/app/hooks/useStaleResource";
import Loader from "./Loader";
import Tryagain from "./Tryagain";

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

  const list = data ?? [];

  if (loading && !list.length) {
    return <Loader isArabic={isArabic} />;
  }

  if (!list.length) {
    return <Tryagain isArabic={isArabic} refetch={refetch} />;
  }

  return (
    <div
      className="
       relative mt-24 
       overflow-hidden 
       md:mt-36 lg:mt-40 
       block
      "
    >
      <Container>
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
        </div>
      </Container>
    </div>
  );
};

export default memo(CategorySlider);
