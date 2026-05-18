"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import CardList from "./CardList";
import MapWrapper from "./MyMap";
import MapButton from "./MapButton";
import NearbyAlertSetupModal from "./NearbyAlertSetupModal";
import LocationPickerModal from "./LocationPickerModal";
import { FormattedItem } from "./getItems";
import Container from "../Container";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import Tryagain from "../category/Tryagain";

interface HomeBodyProps {
  items: FormattedItem[];
  /** undefined = still loading; [] = loaded but none; [...] = has featured items */
  featuredItems?: FormattedItem[] | undefined;
  loading: boolean;
  isRefreshing?: boolean;
  onRefresh: () => void;
}

const CONTENT_LAYOUT_CLASS =
  "relative flex flex-col md:flex-row gap-4 md:gap-5";

const HomeBody = ({
  loading,
  isRefreshing = false,
  items,
  featuredItems,
  onRefresh,
}: HomeBodyProps) => {
  const [showMap, setShowMap] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const { isArabic } = useAppPreferences();

  const handleCloseLocationModal = useCallback(() => {
    setShowLocationModal(false);
  }, []);

  const handleCloseAlertModal = useCallback(() => {
    setShowAlertModal(false);
  }, []);

  const handleOpenLocationModal = useCallback(() => {
    setShowAlertModal(false);
    setShowLocationModal(true);
  }, []);

  const handleOpenAlertModal = useCallback(() => {
    setShowLocationModal(false);
    setShowAlertModal(true);
  }, []);

  /* Listen for mobile FAB map toggle */
  useEffect(() => {
    const handler = () => setShowMap((prev) => !prev);
    window.addEventListener("toggle-map-view", handler);
    return () => window.removeEventListener("toggle-map-view", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      handleOpenLocationModal();
    };

    window.addEventListener("open-nearby-items", handler);
    return () => window.removeEventListener("open-nearby-items", handler);
  }, [handleOpenLocationModal]);

  useEffect(() => {
    const handler = () => {
      handleOpenAlertModal();
    };

    window.addEventListener("open-listing-alerts-modal", handler);
    return () =>
      window.removeEventListener("open-listing-alerts-modal", handler);
  }, [handleOpenAlertModal]);

  const fallbackFeaturedItems = useMemo(
    () => items.filter((it) => Boolean(it.item.isFeatured)),
    [items],
  );

  const topFeaturedItems = useMemo(
    () =>
      featuredItems !== undefined && featuredItems.length > 0
        ? featuredItems
        : featuredItems === undefined
          ? []
          : fallbackFeaturedItems,
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

  const showInitialSkeleton =
    !items.length && (loading || isRefreshing || featuredItems === undefined);

  /** 🔹 الحالات الخاصة */
  if (showInitialSkeleton) {
    const skeletonCards = Array.from({ length: 8 }, (_, index) => index);

    return (
      <Container>
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-9 lg:grid-cols-5 min-[1680px]:grid-cols-6">
          {skeletonCards.map((cardIndex) => (
            <div
              key={`home-card-skeleton-${cardIndex}`}
              className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              aria-hidden="true"
            >
              <div className="aspect-16/11 w-full animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-3/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    );
  }

  if (
    !loading &&
    !isRefreshing &&
    featuredItems !== undefined &&
    !items.length
  ) {
    return <Tryagain isArabic={isArabic} refetch={onRefresh} />;
  }

  /** 🔹 المكون الرئيسي */
  return (
    <Container>
      {featuredItems !== undefined && topFeaturedItems.length > 0 && (
        <section
          className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-3 md:p-4"
          style={{ contain: "layout" }}
        >
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

      {featuredItems === undefined && (
        <section
          aria-hidden="true"
          className="mt-6 rounded-2xl border border-slate-200/60 bg-slate-50/70 p-3 md:p-4"
          style={{ minHeight: 260 }}
        />
      )}

      <div className={`${CONTENT_LAYOUT_CLASS} mt-6`}>
        {/* ✅ قسم العناصر */}
        <CardList items={mainItems} />
        {/* ✅ خريطة تظهر بانزلاق من الجانب */}
        {showMap && (
          <MapWrapper setShowMap={setShowMap} showMap={showMap} items={items} />
        )}
      </div>

      <div className="hidden lg:block">
        <MapButton showMap={showMap} setShowMap={setShowMap} />
      </div>

      <LocationPickerModal
        isOpen={showLocationModal}
        onClose={handleCloseLocationModal}
      />

      <NearbyAlertSetupModal
        isOpen={showAlertModal}
        onClose={handleCloseAlertModal}
      />
    </Container>
  );
};

export default memo(HomeBody);
