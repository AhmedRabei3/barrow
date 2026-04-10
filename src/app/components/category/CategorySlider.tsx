"use client";

import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdOutlineRefresh } from "react-icons/md";
import CategoryList from "./CategoryList";
import categoryFetcher from "./CategoryFetcher";
import Container from "../Container";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import type { CategoryItem, ItemType } from "./types";

interface CategorySliderProps {
  type?: ItemType | null;
  setCatName: (c: string) => void;
  catName: string;
}

const CategorySlider = ({ type, setCatName, catName }: CategorySliderProps) => {
  const [list, setList] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const { isArabic } = useAppPreferences();

  /** 🔹 جلب الفئات من السيرفر */
  useEffect(() => {
    let active = true;

    const fetchCategories = async () => {
      try {
        setLoading(true);
        const categories = await categoryFetcher({
          type,
          withItemsOnly: true,
        });
        if (active) {
          setList(categories);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchCategories();

    return () => {
      active = false;
    };
  }, [type, refreshSeed]);

  /** 🔹 واجهة التحميل */
  if (loading)
    return (
      <div
        className="
      flex flex-col justify-center 
      items-center py-10 gap-3"
      >
        <motion.div
          className="w-6 h-6 rounded-full border-2
           border-neutral-300 border-t-transparent
           "
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-neutral-500 text-sm animate-pulse">
          {isArabic ? "جاري تحميل العناصر..." : "Loading items..."}
        </p>
      </div>
    );

  /** 🔹 في حال عدم وجود فئات */
  if (!list.length)
    return (
      <motion.div
        className="w-full flex flex-col items-center justify-center mt-15 py-6 text-neutral-500 text-sm gap-4"
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
          onClick={() => setRefreshSeed((prev) => prev + 1)}
          className="px-4 py-2 
          rounded-md border 
          border-neutral-300 
          hover:bg-neutral-100 
          text-neutral-700 
          inline-flex items-center gap-2
          dark:border-neutral-600
          dark:hover:bg-neutral-700
          dark:text-neutral-300
          "
        >
          <MdOutlineRefresh className="text-lg" />
          {isArabic ? "إعادة المحاولة" : "Retry"}
        </button>
      </motion.div>
    );

  /** 🔹 عرض الفئات */
  return (
    <div className="relative overflow-hidden mt-24 md:mt-36 lg:mt-40 block">
      <Container>
        <AnimatePresence mode="wait">
          <motion.div
            key={type} // يجعل الحركة تحدث عند تغيّر النوع
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-4 relative"
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
