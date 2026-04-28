"use client";

import React, { useRef, useState, useMemo } from "react";
import {
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { DynamicIcon } from "../../addCategory/IconSetter";
import h from "@/app/hooks";
import { $Enums } from "@prisma/client";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

interface CategoryDroperProps {
  categories: {
    id: string;
    name: string;
    type: $Enums.ItemType;
    icon: string | null;
  }[];
  register: UseFormRegister<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
}

const CategoryDroper = ({
  register,
  watch,
  setValue,
  categories,
}: CategoryDroperProps) => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  h.useClickOutside(dropdownRef, () => setOpen(false));

  const selectedCategoryId = watch("categoryId");

  // العنصر المحدد
  const selected = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );

  // الفلترة
  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [categories, query]);

  const handleSelect = (id: string) => {
    setValue("categoryId", id, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    setOpen(false);
    setQuery(""); // تنظيف البحث بعد الإغلاق
  };

  return (
    <div ref={dropdownRef}>
      <input type="hidden" {...register("categoryId", { required: true })} />

      <label className="text-gray-700 text-sm flex items-center gap-x-3">
        {t("اختر التصنيف", "Select category")}
      </label>

      {/* زر الفتح */}
      <div
        className="
          flex justify-between hover:bg-sky-50 
          items-center border border-neutral-400
          p-2 shadow-md rounded-md 
          cursor-pointer text-sm bg-white
          transition hover:shadow-sm
        "
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex items-center gap-2 ">
          {selected ? (
            <>
              {selected.icon && (
                <DynamicIcon iconName={selected.icon} size={18} />
              )}
              {selected.name}
            </>
          ) : (
            t("اختر التصنيف", "Select category")
          )}
        </span>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <DynamicIcon iconName="FaChevronDown" size={12} />
        </motion.div>
      </div>

      {/* القائمة */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 bg-white shadow-md 
            rounded-md mt-1  p-2 z-20 max-h-64 overflow-y-auto space-y-2"
          >
            {/* حقل البحث */}
            {categories.length > 10 && (
              <div className="relative">
                <div className="absolute left-2 top-2.5 text-gray-400">
                  <DynamicIcon iconName="FaSearch" size={16} />
                </div>
                <input
                  type="text"
                  name="categoryDropdownSearch"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("بحث...", "Search...")}
                  className="w-full pl-7 pr-2 py-2 border rounded-md text-sm 
                focus:outline-none focus:ring-1 focus:ring-sky-700"
                />
              </div>
            )}

            {/* قائمة الفئات */}
            <div className="grid grid-cols-6 gap-2 pt-1">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((c) => (
                  <div
                    key={c.id}
                    className={`flex flex-col items-center justify-center 
                    py-2 rounded-md cursor-pointer text-sm transition
                    hover:bg-sky-100
                    ${
                      selectedCategoryId === c.id
                        ? "bg-sky-200 font-semibold"
                        : ""
                    }
                  `}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(c.id);
                    }}
                  >
                    {c.icon && <DynamicIcon iconName={c.icon} size={18} />}
                    <span className="mt-1">{c.name}</span>
                  </div>
                ))
              ) : (
                <p className="col-span-6 text-center text-gray-500 text-sm py-3">
                  {t("لا توجد نتائج", "No results found")}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryDroper;
