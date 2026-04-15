import React, { memo } from "react";
import { DynamicIcon } from "../addCategory/IconSetter";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { $Enums } from "@prisma/client";
import { useState } from "react";
import OwnerListingStateControl from "./OwnerListingStateControl";

type DetailCardItem = {
  item: {
    id?: string;
    name?: string | null;
    type?: string | null;
    brand?: string | null;
    model?: string | null;
    year?: number | null;
    price?: number | null;
    sellOrRent?: string | null;
    rentType?: string | null;
    status?: string | null;
    manualRentalEndsAt?: string | Date | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    guests?: number | null;
    area?: number | null;
    color?: string | null;
    fuelType?: string | null;
    gearType?: string | null;
    mileage?: number | null;
  };
  averageRating: number | null;
  itemLocation: Array<
    | {
        state?: string | null;
        city?: string;
        address?: string;
      }
    | null
    | undefined
  >;
};

interface DetailCardProps {
  grandItem: DetailCardItem;
  itemType?: $Enums.ItemType;
  isOwnerCard?: boolean;
  onStatusChanged?: () => Promise<void> | void;
  onMenuOpenChange?: (isOpen: boolean) => void;
}

const typeLabelMap: Record<string, { ar: string; en: string }> = {
  NEW_CAR: { ar: "سيارة جديدة", en: "New car" },
  USED_CAR: { ar: "سيارة مستعملة", en: "Used car" },
  PROPERTY: { ar: "عقار", en: "Property" },
  OTHER: { ar: "عنصر", en: "Item" },
};

const rentTypeLabelMap: Record<string, { ar: string; en: string }> = {
  DAILY: { ar: "يوم", en: "day" },
  WEEKLY: { ar: "أسبوع", en: "week" },
  MONTHLY: { ar: "شهر", en: "month" },
  YEARLY: { ar: "سنة", en: "year" },
};

const DetailCard = ({
  grandItem,
  itemType,
  isOwnerCard = false,
  onStatusChanged,
  onMenuOpenChange,
}: DetailCardProps) => {
  const { isArabic } = useAppPreferences();
  const { item, averageRating, itemLocation } = grandItem;
  const [isStateMenuOpen, setIsStateMenuOpen] = useState(false);
  const locationLabel =
    itemLocation[0]?.city ??
    itemLocation[0]?.state ??
    itemLocation[0]?.address ??
    "";

  const titleLabel =
    item.name ||
    [item.brand, item.model].filter(Boolean).join(" ") ||
    (item.type
      ? isArabic
        ? typeLabelMap[item.type]?.ar
        : typeLabelMap[item.type]?.en
      : "") ||
    (isArabic ? "عنصر" : "Listing");

  const formattedPrice = Number(item.price ?? 0).toLocaleString("en-US");
  const averageRatingText =
    averageRating !== null ? averageRating.toFixed(1) : null;

  const pricingSuffix =
    item.sellOrRent === "RENT"
      ? isArabic
        ? `/ ${rentTypeLabelMap[item.rentType ?? ""]?.ar ?? "فترة"}`
        : `/ ${rentTypeLabelMap[item.rentType ?? ""]?.en ?? "period"}`
      : isArabic
        ? "إجمالي"
        : "total";

  return (
    <div
      className={`relative rounded-[18px] dark:border-b
     border-slate-800
      dark:bg-slate-950/70
      px-4 py-4 ${isStateMenuOpen ? "z-90" : "z-20"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="line-clamp-1 text-sm
          font-bold dark:text-white text-neutral-800 sm:text-[15px]"
          >
            {titleLabel}
          </h3>
          <div
            className="mt-1 flex items-center
           gap-2 text-[11px] dark:text-slate-500 text-neutral-800
           sm:text-xs"
          >
            <span className="inline-flex items-center gap-1 truncate">
              <DynamicIcon
                iconName="MdLocationPin"
                size={14}
                className="dark:text-sky-300 text-sky-500"
              />
              <span className="truncate">
                {locationLabel || (isArabic ? "بدون موقع" : "No location")}
              </span>
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-primary sm:text-[15px]">
            ${formattedPrice}
          </p>
          <p className="mt-0.5 text-[11px] dark:text-slate-500 text-neutral-800 sm:text-xs">
            {pricingSuffix}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3 z-index-999">
        <OwnerListingStateControl
          itemId={item.id}
          itemType={itemType}
          sellOrRent={item.sellOrRent}
          status={item.status}
          rentType={item.rentType}
          initialManualRentalEndsAt={item.manualRentalEndsAt}
          isOwner={isOwnerCard}
          onSaved={onStatusChanged}
          onMenuOpenChange={(isOpen) => {
            setIsStateMenuOpen(isOpen);
            onMenuOpenChange?.(isOpen);
          }}
        />
        {averageRatingText ? (
          <span
            className="inline-flex
          items-center rounded-md border
           dark:border-slate-700 dark:bg-slate-900
           px-2.5 py-1 text-[10px] font-bold
           uppercase tracking-[0.16em] text-emerald-800
          border-emerald-500/30 bg-emerald-500/10"
          >
             {averageRatingText} <DynamicIcon iconName="MdStar" size={12} className="text-yellow-500" />
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default memo(DetailCard);
