"use client";

import { memo, useEffect, useId, useMemo, useState } from "react";
import {
  MdOutlineRealEstateAgent,
  MdCarCrash,
  MdDevicesOther,
  MdOutlineChair,
} from "react-icons/md";
import { FaCarSide, FaStethoscope } from "react-icons/fa";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { useSession } from "next-auth/react";
import {
  getOrderedPrimaryCategoryTabs,
  getPrimaryCategoryKey,
  PRIMARY_CATEGORY_TABS,
  type PrimaryCategoryKey,
} from "@/lib/primaryCategories";
import MainCatList from "./MainCatList";
import categoryFetcher from "@/app/components/category/CategoryFetcher";

const TAB_ICONS = {
  MdOutlineRealEstateAgent,
  FaCarSide,
  MdCarCrash,
  MdDevicesOther,
  MdOutlineChair,
  FaStethoscope,
} as const;

interface HomeTabsProps {
  onSelectTab: (key: PrimaryCategoryKey) => void;
  type: string | undefined;
  compact?: boolean;
}

const HomeTab = ({ onSelectTab, type, compact = false }: HomeTabsProps) => {
  const { isArabic } = useAppPreferences();
  const { data: session } = useSession();
  const mainCategoryId = useId();
  const [availableKeys, setAvailableKeys] = useState<
    PrimaryCategoryKey[] | null
  >(null);

  const orderedTabs = useMemo(
    () => getOrderedPrimaryCategoryTabs(session?.user?.preferredInterestOrder),
    [session?.user?.preferredInterestOrder],
  );
  const tabsList =
    availableKeys && availableKeys.length > 0
      ? orderedTabs.filter((tab) => availableKeys.includes(tab.key))
      : orderedTabs;
  const selectedType = getPrimaryCategoryKey(type as never) ?? tabsList[0]?.key;

  useEffect(() => {
    let cancelled = false;

    const loadAvailableTabs = async () => {
      const results = await Promise.all(
        PRIMARY_CATEGORY_TABS.map(async (tab) => {
          const categories = await categoryFetcher({
            type: tab.type,
            withItemsOnly: true,
          });

          return categories.length > 0 ? tab.key : null;
        }),
      );

      if (cancelled) {
        return;
      }

      const nextKeys = results.filter(
        (key): key is PrimaryCategoryKey => key !== null,
      );
      setAvailableKeys(nextKeys);

      if (nextKeys.length === 0) {
        setAvailableKeys(orderedTabs.map((tab) => tab.key));
      }
    };

    void loadAvailableTabs();

    return () => {
      cancelled = true;
    };
  }, [orderedTabs]);

  const handleSelectType = (value: string) => {
    onSelectTab(value as PrimaryCategoryKey);
  };

  return (
    <>
      {/* Main category list */}
      <MainCatList
        compact={compact}
        isArabic={isArabic}
        mainCategoryId={mainCategoryId}
        selectedType={selectedType}
        tabsList={tabsList}
        handleSelectType={handleSelectType}
      />
      {/* Category tabs */}
      <div className={compact ? "hidden" : "hidden md:block"}>
        <div className="relative mx-auto my-2 flex w-fit items-center justify-center rounded-xl border border-slate-200 bg-white/80 p-1.5 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
          {tabsList.map((item) => {
            const isActive = selectedType === item.key;
            const Icon = TAB_ICONS[item.icon as keyof typeof TAB_ICONS];

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectTab(item.key)}
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
