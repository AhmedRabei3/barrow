"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdOutlineRefresh } from "react-icons/md";
import CategoryList from "./CategoryList";
import categoryFetcher from "./CategoryFetcher";
import Container from "../Container";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import type { CategoryItem, ItemType } from "./types";
import { useStaleResource } from "@/app/hooks/useStaleResource";

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

  const { data, loading, isRefreshing, refetch } = useStaleResource<
    CategoryItem[]
  >({
    cacheKey,
    fetcher: async () =>
      categoryFetcher({
        type,
        withItemsOnly: true,
      }),
  });

  const list = data ?? [];

  if (loading && !list.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <motion.div
          className="h-6 w-6 rounded-full border-2 border-neutral-300 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="animate-pulse text-sm text-neutral-500">
          {isArabic ? "جاري تحميل العناصر..." : "Loading items..."}
        </p>
      </div>
    );
  }

  if (!list.length) {
    return (
      <motion.div
        className="mt-15 flex w-full flex-col items-center justify-center gap-4 py-6 text-sm text-neutral-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="dark:text-slate-400">
          {isArabic
            ? "لا توجد فئات لهذا النوع"
            : "No categories available for this type"}
        </p>
        <button
          type="button"
          onClick={refetch}
          className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-4 py-2 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
        >
          <MdOutlineRefresh className="text-lg" />
          {isArabic ? "إعادة المحاولة" : "Retry"}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="relative mt-24 overflow-hidden md:mt-36 lg:mt-40 block">
      <Container>
        {isRefreshing && list.length > 0 && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/85 px-3 py-1.5 text-xs text-neutral-600 shadow-sm backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span>
              {isArabic ? "يتم تحديث الفئات..." : "Refreshing categories..."}
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={type}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative flex items-center gap-4"
          >
            <CategoryList
              list={list}
              setCatName={setCatName}
              catName={catName}
            />
          </motion.div>
        </AnimatePresence>
      </Container>
    </div>
  );
};

export default memo(CategorySlider);
