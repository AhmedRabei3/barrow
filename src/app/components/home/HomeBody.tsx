"use client";

import { memo, useMemo, useState } from "react";
import { MdOutlineRefresh } from "react-icons/md";
import MapButton from "./MapButton";
import CardList from "./CardList";
import MapWrapper from "./MyMap";
import { FormattedItem } from "./getItems";
import Container from "../Container";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface HomeBodyProps {
  items: FormattedItem[];
  featuredItems?: FormattedItem[];
  loading: boolean;
  isRefreshing?: boolean;
  onRefresh: () => void;
}

const CONTENT_LAYOUT_CLASS =
  "relative mt-24 md:mt-6 flex flex-col md:flex-row gap-4 md:gap-5";

interface EmptyStateProps {
  isArabic: boolean;
  onRefresh: () => void;
}

const EmptyState = ({ isArabic, onRefresh }: EmptyStateProps) => (
  <div className="w-full mt-15 flex flex-col items-center justify-center py-6 text-neutral-500 gap-4">
    <p>
      {isArabic
        ? "لا توجد عناصر لهذه الفئة"
        : "No items found for this category"}
    </p>
    <button
      type="button"
      onClick={onRefresh}
      className="px-4 py-2 rounded-md border border-neutral-300 hover:bg-neutral-100 text-neutral-700 inline-flex items-center gap-2"
    >
      <MdOutlineRefresh className="text-lg" />
      {isArabic ? "إعادة المحاولة" : "Try again"}
    </button>
  </div>
);

interface LoadingStateProps {
  isArabic: boolean;
}

const LoadingState = ({ isArabic }: LoadingStateProps) => (
  <div className="w-full flex flex-col items-center justify-center py-8 text-neutral-500 gap-3">
    <p className="loader"></p>
    <p className="animate-pulse">
      {isArabic ? "جاري تحميل العناصر..." : "Loading items..."}
    </p>
  </div>
);

const HomeBody = ({
  loading,
  isRefreshing = false,
  items,
  featuredItems = [],
  onRefresh,
}: HomeBodyProps) => {
  const [showMap, setShowMap] = useState<boolean>(false);
  const { isArabic } = useAppPreferences();
  const fallbackFeaturedItems = useMemo(
    () => items.filter((it) => Boolean(it.item.isFeatured)),
    [items],
  );
  const topFeaturedItems = useMemo(
    () => (featuredItems.length > 0 ? featuredItems : fallbackFeaturedItems),
    [fallbackFeaturedItems, featuredItems],
  );
  const featuredIds = useMemo(
    () => new Set(topFeaturedItems.map((it) => it.item.id)),
    [topFeaturedItems],
  );
  const mainItems = useMemo(() => {
    const regularItems = items.filter((it) => !featuredIds.has(it.item.id));

    return topFeaturedItems.length > 0 && regularItems.length === 0
      ? []
      : regularItems;
  }, [featuredIds, items, topFeaturedItems.length]);

  /** 🔹 الحالات الخاصة */
  if (loading && !items.length) return <LoadingState isArabic={isArabic} />;

  if (!loading && !isRefreshing && !items.length) {
    return <EmptyState isArabic={isArabic} onRefresh={onRefresh} />;
  }

  /** 🔹 المكون الرئيسي */
  return (
    <Container>
      {isRefreshing && items.length > 0 && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/85 px-3 py-1.5 text-xs text-neutral-600 shadow-sm backdrop-blur">
          <span
            className="h-2 w-2 
              animate-pulse 
              rounded-full bg-emerald-500"
          />
          <span>
            {isArabic ? "يتم تحديث العناصر..." : "Refreshing listings..."}
          </span>
        </div>
      )}

      {topFeaturedItems.length > 0 && (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-3 md:p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold text-amber-900">
              {isArabic ? "إعلانات مميزة" : "Featured Listings"}
            </h2>
            <span className="text-xs md:text-sm text-amber-700">
              {isArabic ? "موضوعة في بداية الصفحة" : "Pinned at the top"}
            </span>
          </div>
          <CardList items={topFeaturedItems.slice(0, 8)} />
        </section>
      )}

      <div className={CONTENT_LAYOUT_CLASS}>
        {/* ✅ قسم العناصر */}
        <CardList items={mainItems} />
        {/* ✅ زر عائم لإظهار الخريطة */}
        <MapButton setShowMap={setShowMap} showMap={showMap} />
        {/* ✅ خريطة تظهر بانزلاق من الجانب */}
        <MapWrapper setShowMap={setShowMap} showMap={showMap} items={items} />
      </div>
    </Container>
  );
};

export default memo(HomeBody);
