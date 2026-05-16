"use client";

import { useState, useCallback, useEffect } from "react";
import { Filters, useSearchFilters } from "@/app/hooks/useSearchFilters";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import GeolocationPermissionModal from "../modals/GeolocationPermissionModal";

const DISTANCE_OPTIONS_KM = [1, 5, 10, 25, 50] as const;

interface DistanceFilterProps {
  onDistanceApplied?: (distance: number, lat: number, lng: number) => void;
  value?: Filters["distance"];
  userLat?: number | null;
  userLng?: number | null;
  onChange?: (nextFilters: Partial<Filters>) => void;
}

/**
 * مكون إدخال المسافة للبحث حسب الموقع الجغرافي
 */
export default function DistanceFilter({
  onDistanceApplied,
  value,
  userLat,
  userLng,
  onChange,
}: DistanceFilterProps) {
  const { isArabic } = useAppPreferences();
  const { filters, setFilters } = useSearchFilters();
  const [showGeolocationModal, setShowGeolocationModal] = useState(false);
  const activeDistance = value !== undefined ? value : filters.distance;
  const activeUserLat = userLat !== undefined ? userLat : filters.userLat;
  const activeUserLng = userLng !== undefined ? userLng : filters.userLng;
  const [tempDistance, setTempDistance] = useState<string>(
    String(activeDistance || ""),
  );

  useEffect(() => {
    setTempDistance(String(activeDistance || ""));
  }, [activeDistance]);

  const hasLocation = activeUserLat !== null && activeUserLng !== null;
  const applyFilters = useCallback(
    (nextFilters: Partial<Filters>) => {
      if (onChange) {
        onChange(nextFilters);
        return;
      }

      setFilters(nextFilters);
    },
    [onChange, setFilters],
  );

  const handleCloseModal = useCallback(() => {
    setShowGeolocationModal(false);
  }, []);
  const handleApplyDistance = useCallback(
    (nextDistance?: number) => {
      const distance = nextDistance ?? Number(tempDistance);

      if (!Number.isFinite(distance) || distance <= 0) {
        return; // لا تفعل شيئاً إذا كانت القيمة غير صحيحة
      }

      setTempDistance(String(distance));

      // إذا كان لديه موقع بالفعل، طبّق الفلتر
      if (hasLocation) {
        applyFilters({ distance });
        onDistanceApplied?.(distance, activeUserLat!, activeUserLng!);
      } else {
        // وإلا، اطلب إذن الموقع
        setShowGeolocationModal(true);
      }
    },
    [
      tempDistance,
      hasLocation,
      applyFilters,
      onDistanceApplied,
      activeUserLat,
      activeUserLng,
    ],
  );

  const handlePermissionGranted = useCallback(
    (lat: number, lng: number) => {
      const distance = Number(tempDistance);

      if (!Number.isFinite(distance) || distance <= 0) {
        return;
      }

      applyFilters({ distance, userLat: lat, userLng: lng });
      onDistanceApplied?.(distance, lat, lng);
    },
    [tempDistance, applyFilters, onDistanceApplied],
  );

  const handleOptionSelect = useCallback(
    (distance: number) => {
      void handleApplyDistance(distance);
    },
    [handleApplyDistance],
  );

  const activeDistanceValue = Number(activeDistance);
  const hasActiveDistance =
    Number.isFinite(activeDistanceValue) && activeDistanceValue > 0;

  const handleClearDistance = useCallback(() => {
    setTempDistance("");
    applyFilters({ distance: "", userLat: null, userLng: null });
  }, [applyFilters]);

  const actionLabel = isArabic ? "تحديد المسافة" : "Choose distance";

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {isArabic ? "البحث حسب المسافة" : "Search by Distance"}
          </label>
          {hasActiveDistance && (
            <button
              onClick={handleClearDistance}
              className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              title={isArabic ? "مسح الفلتر" : "Clear filter"}
              type="button"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              <span>{isArabic ? "مسح" : "Clear"}</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2" aria-label={actionLabel}>
          {DISTANCE_OPTIONS_KM.map((distance) => {
            const isSelected = activeDistanceValue === distance;

            return (
              <button
                key={distance}
                type="button"
                onClick={() => handleOptionSelect(distance)}
                className={`inline-flex min-w-16 items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                  isSelected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
                }`}
                aria-pressed={isSelected}
              >
                {distance} {isArabic ? "كم" : "km"}
              </button>
            );
          })}
        </div>

        {!hasLocation && !hasActiveDistance && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isArabic
              ? "عند اختيار مسافة سيطلب التطبيق إذن الوصول إلى موقعك إذا لم يكن مفعلاً بعد"
              : "Choosing a distance will request your location permission if it is not enabled yet"}
          </p>
        )}

        {/* عرض الموقع الحالي */}
        {hasLocation && hasActiveDistance && (
          <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">
              location_on
            </span>
            {isArabic
              ? `يتم البحث في نطاق ${activeDistance} كم من موقعك`
              : `Searching within ${activeDistance} km of your location`}
          </div>
        )}

        {/* رسالة إذا كان هناك مسافة بدون موقع */}
        {!hasLocation && hasActiveDistance && (
          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">info</span>
            {isArabic
              ? "يرجى السماح بتحديد موقعك لتفعيل فلتر المسافة"
              : "Please enable location to apply distance filter"}
          </div>
        )}
      </div>

      <GeolocationPermissionModal
        isOpen={showGeolocationModal}
        onClose={handleCloseModal}
        onPermissionGranted={handlePermissionGranted}
      />
    </>
  );
}
