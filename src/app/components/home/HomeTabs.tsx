"use client";

import { memo, useCallback, useEffect, useId, useMemo, useState } from "react";
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
import { request } from "@/app/utils/axios";

const TAB_ICONS = {
  MdOutlineRealEstateAgent,
  FaCarSide,
  MdCarCrash,
  MdDevicesOther,
  MdOutlineChair,
  FaStethoscope,
} as const;

const hasItemsForType = async (type: string) => {
  try {
    const response = await request.get("/api/items", {
      params: {
        type,
        page: 1,
        limit: 1,
      },
      timeout: 7000,
    });

    const payload = response.data as
      | { success?: boolean; items?: unknown[]; totalCount?: number }
      | undefined;

    if (!payload?.success) {
      return false;
    }

    if (Array.isArray(payload.items) && payload.items.length > 0) {
      return true;
    }

    return typeof payload.totalCount === "number" && payload.totalCount > 0;
  } catch {
    return false;
  }
};

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

interface HomeTabsProps {
  onSelectTab: (key: PrimaryCategoryKey) => void;
  type: string | undefined;
  compact?: boolean;
  isFiltering?: boolean;
}

const HomeTab = ({
  onSelectTab,
  type,
  compact = false,
  isFiltering = false,
}: HomeTabsProps) => {
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

  const loadAvailableTabs = useCallback(async () => {
    const countsByType = await fetchItemTypeCounts();

    if (countsByType) {
      const keysFromCounts = PRIMARY_CATEGORY_TABS.filter(
        (tab) => (countsByType[tab.type] ?? 0) > 0,
      ).map((tab) => tab.key);

      if (keysFromCounts.length > 0) {
        setAvailableKeys(keysFromCounts);
        return;
      }
    }

    const results = await Promise.all(
      PRIMARY_CATEGORY_TABS.map(async (tab) => {
        const categories = await categoryFetcher({
          type: tab.type,
          withItemsOnly: true,
        });

        if (categories.length > 0) {
          return tab.key;
        }

        const hasItems = await hasItemsForType(tab.type);
        return hasItems ? tab.key : null;
      }),
    );

    const nextKeys = results.filter(
      (key): key is PrimaryCategoryKey => key !== null,
    );
    setAvailableKeys(
      nextKeys.length > 0 ? nextKeys : orderedTabs.map((tab) => tab.key),
    );
  }, [orderedTabs]);

  useEffect(() => {
    let cancelled = false;

    void loadAvailableTabs().then(() => {
      if (cancelled) {
        return;
      }
    });

    const handleWindowFocus = () => {
      void loadAvailableTabs();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadAvailableTabs();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadAvailableTabs]);

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
        isFiltering={isFiltering}
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

                {isActive && isFiltering ? (
                  <span className="pointer-events-none absolute bottom-1 left-1/2 h-0.5 w-14 -translate-x-1/2 overflow-hidden rounded-full bg-white/30 dark:bg-sky-900/60">
                    <span className="block h-full w-1/2 bg-linear-to-r from-transparent via-white to-transparent dark:via-sky-200 animate-[tab-bar-sweep_1s_ease-in-out_infinite]" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default memo(HomeTab);
