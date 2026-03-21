"use client";
import React, { Dispatch, SetStateAction, useState } from "react";
import { PreviewGrid } from "./Stat";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import Pagination from "@/app/components/home/Pagination";
import Image from "next/image";
import UserShamCashWithdrawalsTab from "./UserShamCashWithdrawalsTab";

type ProfileItem = {
  id?: string;
  category?: {
    type?: "NEW_CAR" | "USED_CAR" | "OTHER" | "PROPERTY" | string | null;
  };
  item?: { id?: string };
};

type FavoriteItem = {
  itemId: string;
  itemType: "NEW_CAR" | "USED_CAR" | "OTHER" | "PROPERTY";
};

const TabbedView = ({
  items,
  favorites,
  setItemIdToDelete,
  setItemIdToEdit,
  availableToWithdraw,
  onOpenShamCashWithdraw,
  isWithdrawingShamCash,
}: {
  items: ProfileItem[];
  favorites: FavoriteItem[];
  setItemIdToDelete: Dispatch<SetStateAction<string | null>>;
  setItemIdToEdit: Dispatch<SetStateAction<string | null>>;
  availableToWithdraw: number;
  onOpenShamCashWithdraw: () => void;
  isWithdrawingShamCash: boolean;
}) => {
  const { isArabic } = useAppPreferences();
  const [active, setActive] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const newCars = items.filter(
    (it: ProfileItem) => it?.category?.type === "NEW_CAR",
  );
  const oldCars = items.filter(
    (it: ProfileItem) => it?.category?.type === "USED_CAR",
  );
  const otherItems = items.filter(
    (it: ProfileItem) => it?.category?.type === "OTHER",
  );
  const properties = items.filter(
    (it: ProfileItem) => it?.category?.type === "PROPERTY",
  );

  const favoriteSet = new Set(
    favorites.map((fav) => `${fav.itemId}:${fav.itemType}`),
  );

  const favoritesItems = items.filter((it: ProfileItem) => {
    const itemId = it?.item?.id ?? it?.id;
    const itemType = it?.category?.type;
    if (!itemId || !itemType) return false;
    return favoriteSet.has(`${itemId}:${itemType}`);
  });

  const allItems = items;

  const tabs = [
    {
      key: "ALL",
      label: isArabic ? "الكل" : "All",
      icon: "BiGrid",
      count: allItems.length,
    },
    {
      key: "NEW",
      label: isArabic ? "جديدة" : "New",
      icon: "TbCarSuvFilled",
      count: newCars.length,
    },
    {
      key: "USED",
      label: isArabic ? "مستعملة" : "Used",
      icon: "FaCar",
      count: oldCars.length,
    },
    {
      key: "OTHER",
      label: isArabic ? "سلع" : "Items",
      icon: "GiAmpleDress",
      count: otherItems.length,
    },
    {
      key: "PROP",
      label: isArabic ? "عقارات" : "Properties",
      icon: "BiHome",
      count: properties.length,
    },
    {
      key: "FAV",
      label: isArabic ? "المفضلة" : "Favorites",
      icon: "AiFillHeart",
      count: favoritesItems.length,
    },
    {
      key: "WITHDRAWALS",
      label: isArabic ? "سحوباتي" : "My withdrawals",
      iconImage: "/images/shamcash-withdraw-icon.svg",
      count: null,
    },
  ];

  const getItemsFor = (key: string) => {
    switch (key) {
      case "NEW":
        return newCars;
      case "USED":
        return oldCars;
      case "OTHER":
        return otherItems;
      case "PROP":
        return properties;
      case "FAV":
        return favoritesItems;
      default:
        return allItems;
    }
  };

  const activeItems = getItemsFor(active);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pagedItems = activeItems.slice(start, start + ITEMS_PER_PAGE);

  const handleTabChange = (nextTab: string) => {
    setActive(nextTab);
    setCurrentPage(1);
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-3 sm:p-4">
      <div className="flex gap-2 items-center overflow-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors whitespace-nowrap text-sm ${
              active === t.key
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-white text-slate-600 border-slate-200"
            }`}
            aria-pressed={active === t.key}
          >
            {t.iconImage ? (
              <Image
                src={t.iconImage}
                alt={t.label}
                width={18}
                height={18}
                className="h-4.5 w-4.5"
              />
            ) : (
              <DynamicIcon iconName={t.icon} size={18} />
            )}
            <span className="font-medium">{t.label}</span>
            {typeof t.count === "number" ? (
              <span className="text-xs text-slate-400">{t.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-3 border-t border-slate-100 dark:border-slate-700 pt-4">
        {active === "WITHDRAWALS" ? (
          <UserShamCashWithdrawalsTab
            availableToWithdraw={availableToWithdraw}
            onOpenShamCashWithdraw={onOpenShamCashWithdraw}
            isWithdrawingShamCash={isWithdrawingShamCash}
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100">
                {tabs.find((x) => x.key === active)?.label}
              </h4>
              <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">
                {activeItems.length} {isArabic ? "عنصر" : "items"}
              </span>
            </div>
            <PreviewGrid
              items={pagedItems}
              setItemIdToDelete={setItemIdToDelete}
              setItemIdToEdit={setItemIdToEdit}
            />

            <Pagination
              itemsCount={activeItems.length}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={currentPage}
              setPage={setCurrentPage}
              maxPagesToShow={6}
            />
          </>
        )}
      </div>
    </section>
  );
};

export default TabbedView;
