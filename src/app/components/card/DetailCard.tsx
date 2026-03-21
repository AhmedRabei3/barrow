import React, { memo } from "react";
import { AiFillStar } from "react-icons/ai";
import { DynamicIcon } from "../addCategory/IconSetter";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

type DetailCardItem = {
  item: {
    id?: string;
    brand?: string | null;
    model?: string | null;
    year?: number | null;
    price?: number | null;
    sellOrRent?: string | null;
    rentType?: string | null;
  };
  averageRating: number | null;
  totalReviews?: number;
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
}

const getArabicReviewWord = (count: number) => {
  if (count === 2) return "تقييمان";
  if (count >= 3 && count <= 10) return "تقييمات";
  return "تقييم";
};

const DetailCard = ({ grandItem }: DetailCardProps) => {
  const { isArabic } = useAppPreferences();
  const { item, averageRating, totalReviews = 0, itemLocation } = grandItem;
  const locationLabel =
    itemLocation[0]?.state ?? itemLocation[0]?.city ?? itemLocation[0]?.address;

  const { brand, model, year } = item;
  const averageRatingText =
    averageRating !== null ? averageRating.toFixed(1) : isArabic ? "-" : "-";

  const formattedPrice = Number(item.price ?? 0).toLocaleString(
    isArabic ? "ar-SA" : "en-US",
  );

  const rentTypeLabelMap: Record<string, { ar: string; en: string }> = {
    DAILY: { ar: "يوم", en: "day" },
    WEEKLY: { ar: "أسبوع", en: "week" },
    MONTHLY: { ar: "شهر", en: "month" },
    YEARLY: { ar: "سنة", en: "year" },
  };

  const pricingSuffix =
    item.sellOrRent === "RENT"
      ? isArabic
        ? `/ ${rentTypeLabelMap[item.rentType ?? ""]?.ar ?? "فترة"}`
        : `/ ${rentTypeLabelMap[item.rentType ?? ""]?.en ?? "period"}`
      : isArabic
        ? "إجمالي"
        : "total";

  return (
    <div className="px-0.5 pt-2.5 pb-1 flex flex-col gap-0.5 min-h-28">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm sm:text-[15px]">
          {locationLabel || brand || (isArabic ? "عنصر" : "Listing")}
        </h3>
        <div className="shrink-0 inline-flex items-center gap-0.5 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium">
          <AiFillStar className="text-slate-900 dark:text-slate-100" />
          <span>{averageRatingText}</span>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
        {[brand, model].filter(Boolean).join(" ") ||
          (isArabic ? "بدون اسم" : "Unnamed listing")}
      </p>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
        {year ? (isArabic ? `سنة ${year}` : `Year ${year}`) : ""}
        {year && item.sellOrRent ? " • " : ""}
        {item.sellOrRent === "RENT"
          ? isArabic
            ? "للإيجار"
            : "For rent"
          : isArabic
            ? "للبيع"
            : "For sale"}
      </p>

      <div className="mt-1 flex items-center justify-between">
        <p className="text-sm sm:text-[15px] text-slate-900 dark:text-slate-100">
          <span className="font-semibold">${formattedPrice}</span>{" "}
          <span className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            {pricingSuffix}
          </span>
        </p>

        <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {isArabic ? "التفاصيل" : "Details"}
        </span>
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        {isArabic
          ? `${totalReviews} ${getArabicReviewWord(totalReviews)}`
          : `${totalReviews} reviews`}
      </p>

      {!!locationLabel && (
        <p className="text-[11px] sm:text-xs flex items-center text-slate-500 dark:text-slate-400 truncate">
          <DynamicIcon
            iconName="MdLocationPin"
            size={13}
            className="text-slate-500 dark:text-slate-400"
          />
          {locationLabel}
        </p>
      )}
    </div>
  );
};

export default memo(DetailCard);
