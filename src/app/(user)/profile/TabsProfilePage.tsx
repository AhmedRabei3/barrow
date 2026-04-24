"use client";
import React, { Dispatch, SetStateAction, useState } from "react";
import { PreviewGrid } from "./Stat";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import Pagination from "@/app/components/home/Pagination";
import Image from "next/image";
import UserShamCashWithdrawalsTab from "./UserShamCashWithdrawalsTab";
import { ProfilePurchaseRequest } from "@/app/hooks/useProfile";

type ProfileItem = {
  id?: string;
  category?: {
    type?: "NEW_CAR" | "USED_CAR" | "OTHER" | "PROPERTY" | string | null;
  };
  item?: { id?: string; status?: string | null };
  status?: string | null;
};

type FavoriteItem = {
  itemId: string;
  itemType: "NEW_CAR" | "USED_CAR" | "OTHER" | "PROPERTY";
};

export type ProfileTabKey =
  | "ALL"
  | "SOLD"
  | "RENTED"
  | "NEW"
  | "USED"
  | "OTHER"
  | "PROP"
  | "FAV"
  | "REQUESTS"
  | "WITHDRAWALS";

const TabbedView = ({
  items,
  favorites,
  purchaseRequests,
  activeTab,
  onTabChange,
  setItemIdToDelete,
  setItemIdToEdit,
  removingItemIds,
  onStatusChanged,
  availableToWithdraw,
  onOpenShamCashWithdraw,
  isWithdrawingShamCash,
}: {
  items: ProfileItem[];
  favorites: FavoriteItem[];
  purchaseRequests: ProfilePurchaseRequest[];
  activeTab: ProfileTabKey;
  onTabChange: (tab: ProfileTabKey) => void;
  setItemIdToDelete: Dispatch<SetStateAction<string | null>>;
  setItemIdToEdit: Dispatch<SetStateAction<string | null>>;
  removingItemIds: string[];
  onStatusChanged?: () => Promise<void> | void;
  availableToWithdraw: number;
  onOpenShamCashWithdraw: () => void;
  isWithdrawingShamCash: boolean;
}) => {
  const { isArabic } = useAppPreferences();
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
  const getItemStatus = (it: ProfileItem) =>
    it?.item?.status ?? it?.status ?? null;
  const soldItems = items.filter(
    (it: ProfileItem) => getItemStatus(it) === "SOLD",
  );
  const rentedItems = items.filter((it: ProfileItem) => {
    const status = getItemStatus(it);
    return status === "RENTED" || status === "RESERVED";
  });

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
      key: "SOLD",
      label: isArabic ? "المباع" : "Sold",
      icon: "BsBagCheck",
      count: soldItems.length,
    },
    {
      key: "RENTED",
      label: isArabic ? "المؤجّر" : "Rented",
      icon: "HiOutlineHome",
      count: rentedItems.length,
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
      icon: "MdDevicesOther",
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
      key: "REQUESTS",
      label: isArabic ? "طلبات الشراء والإيجار" : "Purchase & rental requests",
      icon: "MdOutlineShoppingCart",
      count: purchaseRequests.length,
    },
    {
      key: "WITHDRAWALS",
      label: isArabic ? "سحوباتي" : "My withdrawals",
      iconImage: "/images/shamcash-withdraw-icon.png",
      count: null,
    },
  ];

  const getItemsFor = (key: string) => {
    switch (key) {
      case "SOLD":
        return soldItems;
      case "RENTED":
        return rentedItems;
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

  const active = activeTab;
  const activeItems = getItemsFor(active);
  const activeCount =
    active === "REQUESTS" ? purchaseRequests.length : activeItems.length;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pagedItems = activeItems.slice(start, start + ITEMS_PER_PAGE);

  const handleTabChange = (nextTab: ProfileTabKey) => {
    onTabChange(nextTab);
    setCurrentPage(1);
  };

  return (
    <section className="rounded-none border-y border-slate-200 bg-white px-4 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-xl sm:border sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
            {isArabic ? "إدارة الحساب" : "Workspace controls"}
          </p>
          <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {isArabic ? "العناصر والنشاط" : "Listings and activity"}
          </h3>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {activeCount} {isArabic ? "عنصر" : "items"}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-2 overflow-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key as ProfileTabKey)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm transition-colors ${
              active === t.key
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-white"
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
              <span
                className={`text-xs ${
                  active === t.key
                    ? "text-white/80"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
        {active === "WITHDRAWALS" ? (
          <UserShamCashWithdrawalsTab
            availableToWithdraw={availableToWithdraw}
            onOpenShamCashWithdraw={onOpenShamCashWithdraw}
            isWithdrawingShamCash={isWithdrawingShamCash}
          />
        ) : active === "REQUESTS" ? (
          <div className="space-y-3">
            {purchaseRequests.length ? (
              purchaseRequests.map((request) => {
                const statusText =
                  request.status === "PENDING_ADMIN"
                    ? isArabic
                      ? "بانتظار المشرف"
                      : "Pending admin"
                    : request.status === "ADMIN_REJECTED"
                      ? isArabic
                        ? "مرفوض من المشرف"
                        : "Rejected by admin"
                      : request.status === "PENDING_OWNER"
                        ? isArabic
                          ? "بانتظار قرار المالك"
                          : "Pending owner"
                        : request.status === "OWNER_DECLINED"
                          ? isArabic
                            ? "مرفوض من المالك"
                            : "Declined by owner"
                          : request.status === "OWNER_ACCEPTED"
                            ? isArabic
                              ? "موافق عليه من المالك"
                              : "Accepted by owner"
                            : request.status === "CONVERTED_TO_TRANSACTION"
                              ? isArabic
                                ? "تم تحويله إلى معاملة"
                                : "Converted to transaction"
                              : request.status;

                return (
                  <div
                    key={request.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {request.itemSummary?.title ||
                            (isArabic ? "عنصر" : "Listing")}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {isArabic ? "المشتري:" : "Buyer:"}{" "}
                          {request.buyer?.name ||
                            request.buyer?.email ||
                            request.buyerId}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {isArabic ? "الهاتف:" : "Phone:"}{" "}
                          {request.phoneNumber}
                        </p>
                      </div>
                      <span className="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {statusText}
                      </span>
                    </div>

                    {request.buyerNote ? (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        {isArabic ? "ملاحظة:" : "Note:"} {request.buyerNote}
                      </p>
                    ) : null}

                    {request.rejectionReason &&
                    (request.status === "OWNER_DECLINED" ||
                      request.status === "ADMIN_REJECTED") ? (
                      <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                        {isArabic ? "سبب الرفض:" : "Rejection reason:"}{" "}
                        {request.rejectionReason}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {isArabic ? "العرض:" : "Offer:"}{" "}
                        {request.offeredPrice ?? "-"}
                      </span>
                      {request.itemSummary?.listingUrl ? (
                        <a
                          href={request.itemSummary.listingUrl}
                          className="font-semibold text-primary hover:underline"
                        >
                          {isArabic ? "عرض العنصر" : "View listing"}
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {isArabic
                  ? "لا توجد طلبات شراء أو إيجار على عناصرك حالياً"
                  : "No purchase or rental requests on your listings yet"}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                  {isArabic ? "إدارة المحتوى" : "Content management"}
                </p>
                <h4 className="mt-2 text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
                  {tabs.find((x) => x.key === active)?.label}
                </h4>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300 sm:text-sm">
                {activeCount} {isArabic ? "عنصر" : "items"}
              </span>
            </div>
            <PreviewGrid
              items={pagedItems}
              setItemIdToDelete={setItemIdToDelete}
              setItemIdToEdit={setItemIdToEdit}
              onStatusChanged={onStatusChanged}
              removingItemIds={removingItemIds}
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
