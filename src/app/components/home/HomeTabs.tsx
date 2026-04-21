"use client";

import { $Enums } from "@prisma/client";
import { memo, useId } from "react";
import {
  MdOutlineBallot,
  MdOutlineRealEstateAgent,
  MdCarCrash,
  MdDevicesOther,
} from "react-icons/md";
import { FaCarSide } from "react-icons/fa";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const TAB_ICONS = {
  MdOutlineRealEstateAgent,
  FaCarSide,
  MdCarCrash,
  MdDevicesOther,
  MdOutlineBallot,
} as const;

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
        <div className="relative mx-auto my-2 flex w-fit items-center justify-center rounded-xl border border-slate-200 bg-white/80 p-1.5 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
          {tabsList.map((item) => {
            const isActive = selectedType === item.type;
            const Icon = TAB_ICONS[item.icon as keyof typeof TAB_ICONS];

            return (
              <button
                key={item.type}
                type="button"
                onClick={() => setType(item.type as $Enums.ItemType)}
                className={`
                  group relative mx-0.5 flex cursor-pointer select-none items-center gap-2 rounded-xl px-3 py-1.5 font-medium transition-all duration-300 xl:px-4
                  ${isActive ? "bg-linear-to-r from-blue-500 to-indigo-500 text-white shadow-md" : "text-gray-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-sky-300"}
                `}
              >
                <div className="relative z-10 flex flex-col items-center gap-1 md:flex-col lg:flex-row lg:items-center lg:gap-1">
                  <Icon size={20} />

                  <span className="hidden text-center text-sm 2xl:block">
                    {isArabic ? item.nameAr : item.nameEn}
                  </span>

                  <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-100 px-2 py-1 text-xs text-blue-700 opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 dark:bg-slate-800 dark:text-sky-300 2xl:hidden">
                    {isArabic ? item.nameAr : item.nameEn}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default memo(HomeTab);
