"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { DynamicIcon } from "../addCategory/IconSetter";

interface MapPickerProps {
  onLocationSelect: (data: {
    lat: number;
    lng: number;
    address: string;
    city: string;
    state: string;
    country: string;
  }) => void;
  initialCenter?: [number, number];
  radius?: number;
}

/* ── lazy-load the leaflet map to avoid SSR issues ── */
const MapPicker = dynamic<MapPickerProps>(
  // @ts-expect-error Next resolves the client-only module with the source extension here.
  () => import("../modals/mapPicker/MapPickerModal.tsx"),
  {
    ssr: false,
    loading: () => (
      <div className="h-55 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
    ),
  },
);

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LocationPickerModal({
  isOpen,
  onClose,
}: LocationPickerModalProps) {
  const { isArabic } = useAppPreferences();
  const { filters, setFilters } = useSearchFilters();

  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  /* Reset state when modal opens */
  useEffect(() => {
    if (!isOpen) return;
    setSelectedLat(filters.userLat ?? null);
    setSelectedLng(filters.userLng ?? null);
    setLocating(false);
    setLocationError(null);
  }, [isOpen, filters.userLat, filters.userLng]);

  const handleUseCurrentLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError(
        t(
          "الموقع الجغرافي غير مدعوم في هذا المتصفح",
          "Geolocation is not supported in this browser",
        ),
      );
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setSelectedLat(coords.latitude);
        setSelectedLng(coords.longitude);
        setLocating(false);
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? t(
                "تم رفض إذن الموقع. اسمح للموقع من إعدادات المتصفح ثم أعد المحاولة.",
                "Location permission denied. Allow this site in browser settings and try again.",
              )
            : t(
                "فشل تحديد الموقع، حاول مرة أخرى.",
                "Failed to get location, please try again.",
              ),
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, [t]);

  const handleSave = useCallback(() => {
    if (selectedLat === null || selectedLng === null) return;
    setFilters({ userLat: selectedLat, userLng: selectedLng });
    onClose();
  }, [selectedLat, selectedLng, setFilters, onClose]);

  const handleMapLocationSelect = useCallback(
    ({
      lat,
      lng,
    }: MapPickerProps extends { onLocationSelect: (data: infer T) => void }
      ? T
      : never) => {
      setSelectedLat(lat);
      setSelectedLng(lng);
    },
    [],
  );

  if (!isOpen) return null;

  const initialCenter: [number, number] | undefined =
    selectedLat !== null && selectedLng !== null
      ? [selectedLat, selectedLng]
      : undefined;

  return (
    <div
      className="fixed inset-0 z-1200 flex items-center justify-center bg-slate-950/55 p-3"
      role="dialog"
      aria-modal="true"
      aria-label={t("تحديد موقعي", "Set My Location")}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-blue-600">
              my_location
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("تحديد موقعي", "Set My Location")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="x"
            className="rounded-full p-1.5 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <DynamicIcon iconName="FaWindowClose" size={18} />
          </button>
        </div>

        {/* ── Description ── */}
        <p
          className="px-4 pb-2 pt-3 text-center text-xs text-slate-600 dark:text-slate-400"
          dir={isArabic ? "rtl" : "ltr"}
        >
          {t(
            "قم بتحديد موقعك كي يتم عرض العناصر حسب قربها منك",
            "Set your location to display items sorted by proximity",
          )}
        </p>

        {/* ── Mini map ── */}
        <div className="mx-3 mb-2 overflow-hidden rounded-2xl">
          <MapPicker
            onLocationSelect={handleMapLocationSelect}
            initialCenter={initialCenter}
          />
        </div>

        {/* ── GPS button ── */}
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
          >
            <span className="material-symbols-outlined text-sm">gps_fixed</span>
            {locating
              ? t("جاري التحديد...", "Locating...")
              : t("استخدام موقعي الحالي", "Use my current location")}
          </button>
          {locationError && (
            <p className="mt-1 text-center text-xs text-red-500">
              {locationError}
            </p>
          )}
        </div>

        {/* ── Save button ── */}
        <div className="px-3 pb-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={selectedLat === null || selectedLng === null}
            className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("حفظ", "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
