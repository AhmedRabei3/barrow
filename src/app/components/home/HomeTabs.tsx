"use client";

import { LayoutGroup, motion } from "framer-motion";
import { DynamicIcon } from "../addCategory/IconSetter";
import { $Enums } from "@prisma/client";
import { memo, useId } from "react";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface HomeTabsProps {
  setType: (t: $Enums.ItemType) => void;
  type: $Enums.ItemType | undefined;
  compact?: boolean;
}

const HomeTab = ({ setType, type, compact = false }: HomeTabsProps) => {
  const { isArabic } = useAppPreferences();
  const mainCategoryId = useId();

  const tabsList: {
    nameAr: string;
    nameEn: string;
    type: $Enums.ItemType | "ALL";
    icon: string;
  }[] = [
    {
      nameAr: "عقارات",
      nameEn: "Real Estate",
      type: "PROPERTY" as $Enums.ItemType,
      icon: "MdOutlineRealEstateAgent",
    },
    {
      nameAr: "سيارة جديدة",
      nameEn: "New Car",
      type: "NEW_CAR" as $Enums.ItemType,
      icon: "FaCarSide",
    },
    {
      nameAr: "سيارة مستعملة",
      nameEn: "Used Car",
      type: "USED_CAR" as $Enums.ItemType,
      icon: "MdCarCrash",
    },
    {
      nameAr: "أخرى",
      nameEn: "Other",
      type: "OTHER" as $Enums.ItemType,
      icon: "MdDevicesOther",
    },
    { nameAr: "الكل", nameEn: "All", type: "ALL", icon: "MdOutlineBallot" },
  ];

  const selectedType = type ?? ("ALL" as $Enums.ItemType);

  const handleSelectType = (value: string) => {
    setType(value as $Enums.ItemType);
  };

  return (
    <>
      <div className={compact ? "w-full" : "w-full md:hidden"}>
        <label htmlFor={mainCategoryId} className="sr-only">
          {isArabic ? "التصنيف الرئيسي" : "Main category"}
        </label>
        <div className="relative w-full">
          <select
            id={mainCategoryId}
            name="mainCategory"
            value={selectedType}
            onChange={(event) => handleSelectType(event.target.value)}
            className="
              w-full rounded-xl border border-indigo-200 bg-white
              px-2.5 py-2 text-xs font-medium text-slate-800 shadow-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100
            "
          >
            {tabsList.map((item) => (
              <option key={item.type} value={item.type}>
                {isArabic ? item.nameAr : item.nameEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={compact ? "hidden" : "hidden md:block"}>
        <LayoutGroup id="home-tabs">
          <div
            className="relative my-2 flex items-center 
          justify-center bg-white/80 backdrop-blur-md p-1.5
          rounded-xl shadow-sm border border-slate-200 w-fit 
          dark:bg-slate-900/80 dark:border-slate-700
          mx-auto
        "
          >
            {tabsList.map((item) => {
              const isActive = selectedType === item.type;

              return (
                <motion.button
                  key={item.type}
                  type="button"
                  onClick={() => setType(item.type as $Enums.ItemType)}
                  className={`
                relative cursor-pointer select-none px-3 xl:px-4 py-1.5 mx-0.5 rounded-xl 
                flex items-center gap-2 font-medium transition-colors duration-300 group
                ${isActive ? "text-white" : "text-gray-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-sky-300"}
              `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {/* خلفية التبويب النشط */}
                  {isActive && (
                    <motion.div
                      layoutId="activeHomeTabBackground"
                      className="absolute inset-0 bg-linear-to-r from-blue-500 to-indigo-500 rounded-xl shadow-md"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 32,
                        mass: 0.6,
                      }}
                    />
                  )}

                  {/* المحتوى */}
                  <div
                    className="
                  relative z-10 
                  flex flex-col items-center gap-1
                  md:flex-col
                  lg:flex-row lg:gap-1 lg:items-center
                "
                  >
                    <DynamicIcon iconName={item.icon} size={20} />

                    {/* النص — في الشاشات الكبيرة والأكبر */}
                    <span className="hidden 2xl:block text-sm text-center">
                      {isArabic ? item.nameAr : item.nameEn}
                    </span>

                    {/* Tooltip — يظهر على الشاشات المتوسطة ومادون */}
                    <span
                      className="
                    absolute -bottom-7 left-1/2 -translate-x-1/2 
                    px-2 py-1 text-xs rounded-md shadow-md whitespace-nowrap
                    bg-gray-100 text-blue-700 dark:bg-slate-800 dark:text-sky-300
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-200
                    2xl:hidden
                  "
                    >
                      {isArabic ? item.nameAr : item.nameEn}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </>
  );
};

export default memo(HomeTab);
