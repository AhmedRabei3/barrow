"use client";

import { memo, useMemo, useState } from "react";
import MapButton from "./MapButton";
import CardList from "./CardList";
import CardListSkeleton from "./CardListSkeleton";
import MapWrapper from "./MyMap";
import { FormattedItem } from "./getItems";
import Container from "../Container";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import Tryagain from "../category/Tryagain";

interface HomeBodyProps {
  items: FormattedItem[];
  featuredItems?: FormattedItem[];
  loading: boolean;
  isRefreshing?: boolean;
  onRefresh: () => void;
}

const CONTENT_LAYOUT_CLASS =
  "relative mt-8 md:mt-6 flex flex-col md:flex-row gap-4 md:gap-5";

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
  if (loading && !items.length) {
    return (
      <Container>
        <div className={CONTENT_LAYOUT_CLASS}>
          <CardListSkeleton count={10} />
        </div>
      </Container>
    );
  }

  if (!loading && !isRefreshing && !items.length) {
    return <Tryagain isArabic={isArabic} refetch={onRefresh} />;
  }

  /** 🔹 المكون الرئيسي */
  return (
    <Container>
      {isRefreshing && items.length > 0 && (
        <div className="mb-4">
          <CardListSkeleton count={3} />
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
