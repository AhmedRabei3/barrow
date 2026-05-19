"use client";

import {
  Circle,
  ZoomControl,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import Link from "next/link";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { buildListingDetailsPath } from "@/lib/listingSeo";
import Image from "next/image";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";
import { useSession } from "next-auth/react";
import { DynamicIcon } from "../addCategory/IconSetter";

const ALERT_RADIUS_OPTIONS_KM = [1, 5, 10, 25, 50];
const ALERT_ITEM_TYPE_OPTIONS = [
  { value: "", ar: "كل العناصر", en: "All items" },
  { value: "PROPERTY", ar: "منزل / عقار", en: "Home / Property" },
  { value: "NEW_CAR", ar: "سيارة جديدة", en: "New car" },
  { value: "USED_CAR", ar: "سيارة مستعملة", en: "Used car" },
  { value: "OTHER", ar: "دراجة نارية / أخرى", en: "Motorcycle / Other" },
];

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getZoomForDistance = (distanceKm) => {
  if (!distanceKm || distanceKm <= 1) return 14;
  if (distanceKm <= 5) return 13;
  if (distanceKm <= 10) return 12;
  if (distanceKm <= 25) return 11;
  if (distanceKm <= 50) return 10;
  return 9;
};

const getRadiusBounds = (center, radiusMeters) =>
  L.latLng(center).toBounds(radiusMeters);

const formatPrice = (price, locale) => {
  if (!Number.isFinite(price)) return null;

  return new Intl.NumberFormat(locale === "ar" ? "ar-SY" : "en-US", {
    maximumFractionDigits: 0,
  }).format(price);
};

const FitBounds = ({ items, userPosition, radiusKm }) => {
  const map = useMap();

  useEffect(() => {
    if (userPosition && radiusKm) {
      const bounds = getRadiusBounds(userPosition, radiusKm * 1000);

      items.forEach((item) => {
        bounds.extend([item.latitude, item.longitude]);
      });

      map.fitBounds(bounds, {
        padding: [70, 70],
        maxZoom: getZoomForDistance(radiusKm),
      });
      return;
    }

    if (userPosition && !items.length) {
      map.flyTo(userPosition, getZoomForDistance(radiusKm), {
        duration: 0.8,
      });
      return;
    }

    if (items.length) {
      const bounds = L.latLngBounds(
        items.map((i) => [i.latitude, i.longitude]),
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [items, map, radiusKm, userPosition]);

  return null;
};

const createListingIcon = (isFeatured) =>
  L.divIcon({
    className: "custom-map-marker",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${isFeatured ? 22 : 18}px;height:${isFeatured ? 22 : 18}px;border-radius:999px;background:${isFeatured ? "#f59e0b" : "#2563eb"};border:3px solid rgba(255,255,255,0.96);box-shadow:0 10px 25px rgba(15,23,42,0.25)"></div>`,
    iconSize: [isFeatured ? 22 : 18, isFeatured ? 22 : 18],
    iconAnchor: [isFeatured ? 11 : 9, isFeatured ? 11 : 9],
    popupAnchor: [0, -12],
  });

const userIcon = L.divIcon({
  className: "custom-user-marker",
  html: '<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:999px;background:#0f172a;border:4px solid #22c55e;box-shadow:0 10px 25px rgba(34,197,94,0.35)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

const createClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  const tone = count > 80 ? "#0f172a" : count > 20 ? "#1d4ed8" : "#2563eb";

  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:999px;background:${tone};border:3px solid rgba(255,255,255,0.95);color:#fff;font-weight:700;font-size:12px;box-shadow:0 14px 28px rgba(15,23,42,0.35)">${count}</div>`,
    className: "map-cluster-icon",
    iconSize: [42, 42],
  });
};

const SYRIA_CENTER = [34.8021, 38.9968];

const pickerMarkerIcon = L.divIcon({
  className: "picker-marker",
  html: '<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:#2563eb;border:4px solid #fff;box-shadow:0 4px 16px rgba(37,99,235,0.5)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const ClickableLayer = ({ onPlace }) => {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapClient = ({
  setShowMap,
  items,
  promptForLocationSelection = false,
}) => {
  const { isArabic } = useAppPreferences();
  const { filters, setFilters } = useSearchFilters();
  const { data: session, status: sessionStatus } = useSession();
  const t = useCallback((ar, en) => (isArabic ? ar : en), [isArabic]);
  const locale = isArabic ? "ar" : "en";
  const [mapInstance, setMapInstance] = useState(null);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [tempPickerPos, setTempPickerPos] = useState(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isNearbyQuickMode, setIsNearbyQuickMode] = useState(false);
  const [isAlertAccordionOpen, setIsAlertAccordionOpen] = useState(false);
  const [alertItemType, setAlertItemType] = useState(filters.type ?? "");
  const [alertCategoryName, setAlertCategoryName] = useState(
    filters.catName ?? "",
  );
  const [alertAction, setAlertAction] = useState(filters.action ?? "");
  const userPosition = useMemo(
    () =>
      filters.userLat !== null && filters.userLng !== null
        ? [filters.userLat, filters.userLng]
        : null,
    [filters.userLat, filters.userLng],
  );
  const alertRadiusKm = Number(filters.distance);
  const hasAlertRadius = Number.isFinite(alertRadiusKm) && alertRadiusKm > 0;

  const itemsWithDistance = useMemo(() => {
    if (!userPosition) {
      return items.map((item) => ({ ...item, distanceKm: null }));
    }

    return items
      .map((item) => ({
        ...item,
        distanceKm: haversineKm(
          userPosition[0],
          userPosition[1],
          item.latitude,
          item.longitude,
        ),
      }))
      .sort((a, b) => {
        const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      });
  }, [items, userPosition]);

  const visibleItems = itemsWithDistance;

  const summaryLabel = userPosition
    ? t(
        `يتم ترتيب ${visibleItems.length} عنصر حسب قربها من موقعك`,
        `${visibleItems.length} items ordered nearest to your location`,
      )
    : "";

  const buttonText = useMemo(
    () =>
      isArabic
        ? {
            closeMap: "إغلاق الخريطة",
            hideFilters: "إخفاء الفلاتر",
            showFilters: "إظهار الفلاتر",
            closeFilters: "إغلاق الفلاتر",
            notifyNewMatches: "أعلمني عند توفر جديد",
            enabling: "جاري التفعيل...",
            recenterArea: "إعادة التمركز على منطقتك",
            editLocation: "تعديل الموقع",
            useCurrentLocation: "استخدام موقعي الحالي",
            locating: "جاري تحديد موقعك...",
            saveLocation: "حفظ الموقع",
            cancel: "إلغاء",
            alertRadius: "نطاق التنبيه",
            clearRadius: "مسح النطاق",
          }
        : {
            closeMap: "Close map",
            hideFilters: "Hide filters",
            showFilters: "Show filters",
            closeFilters: "Close filters",
            notifyNewMatches: "Notify me about new matches",
            enabling: "Enabling...",
            recenterArea: "Recenter on your area",
            editLocation: "Edit location",
            useCurrentLocation: "Use my current location",
            locating: "Locating you...",
            saveLocation: "Save location",
            cancel: "Cancel",
            alertRadius: "Alert radius",
            clearRadius: "Clear radius",
          },
    [isArabic],
  );

  useEffect(() => {
    if (!promptForLocationSelection) {
      return;
    }

    setIsFilterPanelOpen(true);
    setIsNearbyQuickMode(true);
    setIsAlertAccordionOpen(true);
    setTempPickerPos(userPosition ? [...userPosition] : null);
    setIsEditingLocation(true);
  }, [promptForLocationSelection, userPosition]);

  const handleMapReady = useCallback((event) => {
    setMapInstance(event.target);
  }, []);

  const recenterToActiveArea = useCallback(() => {
    if (!mapInstance) return;

    if (userPosition && hasAlertRadius) {
      const bounds = getRadiusBounds(userPosition, alertRadiusKm * 1000);

      mapInstance.fitBounds(bounds, {
        padding: [70, 70],
        maxZoom: getZoomForDistance(alertRadiusKm),
      });
      return;
    }

    if (userPosition) {
      mapInstance.flyTo(userPosition, 13, { duration: 0.8 });
      return;
    }

    if (visibleItems.length > 0) {
      const bounds = L.latLngBounds(
        visibleItems.map((item) => [item.latitude, item.longitude]),
      );
      mapInstance.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 14,
      });
    }
  }, [alertRadiusKm, hasAlertRadius, mapInstance, userPosition, visibleItems]);

  const handleAlertRadiusSelect = useCallback(
    (radius) => {
      setFilters({ distance: radius });
    },
    [setFilters],
  );

  const handleClearAlertRadius = useCallback(() => {
    setFilters({ distance: "" });
  }, [setFilters]);

  /* const handleTempPickerPlace = useCallback((lat, lng) => {
    setTempPickerPos([lat, lng]);
  }, []); */

  const handleEnableAvailabilityAlert = useCallback(async () => {
    if (sessionStatus === "loading") {
      return;
    }

    if (!session?.user?.id) {
      setAlertFeedback({
        type: "warning",
        text: t(
          "يرجى تسجيل الدخول أولاً لتفعيل التنبيه",
          "Please sign in first to enable this alert",
        ),
      });
      return;
    }

    const effectivePosition = isNearbyQuickMode
      ? tempPickerPos || userPosition
      : userPosition;

    if (!effectivePosition || !hasAlertRadius) {
      setAlertFeedback({
        type: "warning",
        text: t(
          "حدّد موقعًا ونطاق تنبيه أولاً، ثم فعّل التنبيه",
          "Pick a location and alert radius first, then enable the alert",
        ),
      });
      return;
    }

    setAlertSaving(true);
    setAlertFeedback(null);

    try {
      const res = await fetch("/api/listing-alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat: effectivePosition[0],
          lng: effectivePosition[1],
          radiusKm: alertRadiusKm,
          itemType: (isNearbyQuickMode ? alertItemType : filters.type) || null,
          action: (isNearbyQuickMode ? alertAction : filters.action) || null,
          catName: isNearbyQuickMode ? alertCategoryName : filters.catName,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message ||
            t("تعذر تفعيل التنبيه حالياً", "Failed to enable alert right now"),
        );
      }

      if (isNearbyQuickMode && tempPickerPos) {
        setFilters({ userLat: tempPickerPos[0], userLng: tempPickerPos[1] });
      }

      const selectedTypeLabel = ALERT_ITEM_TYPE_OPTIONS.find(
        (option) => option.value === alertItemType,
      );

      setAlertFeedback({
        type: "success",
        text: isNearbyQuickMode
          ? t(
              `تم حفظ التنبيه. سيتم إشعارك عند توفر ${selectedTypeLabel?.ar || "عنصر"} جديد ضمن النطاق ${alertRadiusKm} كم حول الموقع المحدد.`,
              `Alert saved. You will be notified when a new ${selectedTypeLabel?.en || "listing"} appears within ${alertRadiusKm} km of the selected area.`,
            )
          : data?.message ||
            t("تم تفعيل التنبيه بنجاح", "Alert has been enabled successfully"),
      });
    } catch (error) {
      setAlertFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : t("حدث خطأ غير متوقع", "Unexpected error occurred"),
      });
    } finally {
      setAlertSaving(false);
    }
   }, [
    alertRadiusKm,
    alertAction,
    alertCategoryName,
    alertItemType,
    filters.action,
    filters.catName,
    filters.type,
    hasAlertRadius,
    isNearbyQuickMode,
    session?.user?.id,
    sessionStatus,
    setFilters,
    tempPickerPos,
    t,
    userPosition,
  ]);

  // Initialise picker state when the panel opens / closes
  useEffect(() => {
    if (isFilterPanelOpen) {
      setTempPickerPos(userPosition ? [...userPosition] : null);
      setIsEditingLocation(!userPosition);
    } else {
      setIsEditingLocation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFilterPanelOpen]);

  const handleSavePickerLocation = useCallback(() => {
    if (!tempPickerPos) return;
    setFilters({ userLat: tempPickerPos[0], userLng: tempPickerPos[1] });
    setIsEditingLocation(false);
  }, [setFilters, tempPickerPos]);

  const handleOpenLocationEditor = useCallback(() => {
    setTempPickerPos(userPosition ? [...userPosition] : null);
    setIsEditingLocation(true);
  }, [userPosition]);

  const handleCancelLocationEdit = useCallback(() => {
    setIsEditingLocation(false);
    setTempPickerPos(userPosition ? [...userPosition] : null);
  }, [userPosition]);

  const handleUseCurrentLocation = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError(
        t(
          "الموقع الجغرافي غير مدعوم في هذا المتصفح",
          "Geolocation is not supported in this browser",
        ),
      );
      return;
    }

    setLocatingUser(true);
    setLocationError(null);

    if ("permissions" in navigator && navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        if (permission.state === "denied") {
          setLocatingUser(false);
          setLocationError(
            t(
              "إذن الموقع مرفوض. فعّل الإذن لهذا الموقع من إعدادات المتصفح ثم أعد المحاولة.",
              "Location permission is denied. Enable it for this site in browser settings and try again.",
            ),
          );
          return;
        }
      } catch {
        // Continue directly with getCurrentPosition when query fails.
      }
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextPos = [coords.latitude, coords.longitude];
        setFilters({ userLat: nextPos[0], userLng: nextPos[1] });
        setTempPickerPos(nextPos);
        setIsEditingLocation(false);
        setLocatingUser(false);
      },
      (err) => {
        let message = t("فشل الحصول على الموقع", "Failed to get your location");

        if (err.code === err.PERMISSION_DENIED) {
          message = t(
            "تم رفض إذن الموقع. اسمح للموقع من إعدادات المتصفح ثم أعد المحاولة.",
            "Location permission was denied. Allow this site in browser settings and try again.",
          );
        } else if (err.code === err.TIMEOUT) {
          message = t(
            "انتهت مهلة تحديد الموقع. حاول مرة أخرى في مكان بإشارة أفضل.",
            "Location request timed out. Try again in an area with better signal.",
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = t(
            "الموقع غير متاح حالياً. تأكد من تشغيل GPS/Location Services في الهاتف.",
            "Location is currently unavailable. Make sure GPS/Location Services are enabled on the phone.",
          );
        }

        setLocationError(message);
        setLocatingUser(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  }, [setFilters, t]);

  const showLocationPicker = !userPosition || isEditingLocation;

  const closeFilterPanel = useCallback(() => {
    setIsFilterPanelOpen(false);
    setIsNearbyQuickMode(false);
    setIsAlertAccordionOpen(false);
  }, []);

  const toggleFilterPanel = useCallback(() => {
    setIsFilterPanelOpen((current) => !current);
  }, []);

  const panelSideClass = isArabic ? "left-3 md:left-6" : "right-3 md:right-6";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-sm">
      {/* ── Compact floating top bar ── */}
      <div className="absolute inset-x-3 top-3 z-1000 flex items-center justify-between gap-2 md:inset-x-6 md:top-6">
        <button
          onClick={() => setShowMap(false)}
          aria-label={buttonText.closeMap}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2.5 text-sm font-semibold text-white shadow-xl backdrop-blur transition-colors hover:bg-slate-900 dark:bg-slate-800/90 dark:hover:bg-slate-800"
          type="button"
        >
          <span className="material-symbols-outlined text-base">close</span>
          {buttonText.closeMap}
        </button>

        <div className="flex items-center gap-2">
          {summaryLabel && (
            <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur dark:bg-slate-800/90 dark:text-slate-200">
              {summaryLabel}
            </span>
          )}
          <button
            type="button"
            onClick={toggleFilterPanel}
            aria-label={
              isFilterPanelOpen
                ? buttonText.hideFilters
                : buttonText.showFilters
            }
            className="inline-flex items-center justify-center rounded-full bg-white/90 p-2.5 text-slate-700 shadow-lg backdrop-blur transition-colors hover:bg-white dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isFilterPanelOpen
                ? isArabic
                  ? "إخفاء"
                  : "Hide"
                : isArabic
                  ? "إظهار"
                  : "Show"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Side filter drawer ── */}
      <aside
        className={`absolute ${panelSideClass} top-20 bottom-6 z-1000 w-[min(92vw,22rem)] rounded-3xl border border-white/70 bg-white/95 shadow-2xl backdrop-blur transition-transform duration-300 dark:border-slate-700 dark:bg-slate-900/95 ${
          isFilterPanelOpen
            ? "translate-x-0"
            : isArabic
              ? "translate-x-[-115%]"
              : "translate-x-[115%]"
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Drawer header */}
         

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {isNearbyQuickMode ? (
              <>
                <div className="space-y-3 px-4 pb-4 pt-4">
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-700/40 dark:bg-blue-900/20">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                      {t("تحديد الموقع", "Choose location")}
                    </h4>
                    <p className="mt-1 text-xs text-blue-700/85 dark:text-blue-200/80">
                      {t(
                        "حدد أي موقع تريد البحث حوله، ليس بالضرورة موقعك الحالي.",
                        "Pick any location you want to search around, not necessarily your current location.",
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locatingUser}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                  >
                    <span className="material-symbols-outlined text-sm">
                      my_location
                    </span>
                    <span>
                      {locatingUser
                        ? buttonText.locating
                        : buttonText.useCurrentLocation}
                    </span>
                  </button>

                  {locationError && (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
                      {locationError}
                    </p>
                  )}

                  <div
                    className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"
                    style={{ height: "220px" }}
                  >
                    <MapContainer
                      center={tempPickerPos ?? userPosition ?? SYRIA_CENTER}
                      zoom={tempPickerPos || userPosition ? 11 : 6}
                      style={{ height: "220px", width: "100%" }}
                      zoomControl={false}
                      scrollWheelZoom
                      attributionControl={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <ZoomControl position="bottomright" />
                      <ClickableLayer onPlace={handleTempPickerPlace} />
                      {(tempPickerPos || userPosition) && (
                        <Marker
                          position={tempPickerPos ?? userPosition}
                          icon={pickerMarkerIcon}
                          draggable
                          eventHandlers={{
                            dragend(e) {
                              const { lat, lng } = e.target.getLatLng();
                              setTempPickerPos([lat, lng]);
                            },
                          }}
                        />
                      )}
                    </MapContainer>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsAlertAccordionOpen((current) => !current)
                    }
                    className="inline-flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                  >
                    <span>
                      {t("أعلمني عند توفر جديد", "Notify me about new matches")}
                    </span>
                    <span className="material-symbols-outlined text-[18px]">
                      {isAlertAccordionOpen ? "expand_less" : "expand_more"}
                    </span>
                  </button>

                  {isAlertAccordionOpen && (
                    <div className="space-y-3 rounded-2xl border border-emerald-200/80 bg-white p-3 dark:border-emerald-700/40 dark:bg-slate-900/80">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {t(
                          "ما الذي تريد التنبيه عنه؟",
                          "What should we notify you about?",
                        )}
                        <select
                          value={alertItemType}
                          onChange={(e) => setAlertItemType(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {ALERT_ITEM_TYPE_OPTIONS.map((option) => (
                            <option
                              key={option.value || "all"}
                              value={option.value}
                            >
                              {isArabic ? option.ar : option.en}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {t("فئة إضافية (اختياري)", "Extra category (optional)")}
                        <input
                          value={alertCategoryName}
                          onChange={(e) => setAlertCategoryName(e.target.value)}
                          placeholder={t(
                            "مثال: دراجة نارية",
                            "Example: motorcycle",
                          )}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>

                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {t("نوع العملية (اختياري)", "Action type (optional)")}
                        <select
                          value={alertAction}
                          onChange={(e) => setAlertAction(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="">{t("الكل", "Any")}</option>
                          <option value="SELL">{t("بيع", "Sell")}</option>
                          <option value="RENT">{t("إيجار", "Rent")}</option>
                        </select>
                      </label>

                      <div>
                        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {buttonText.alertRadius}
                        </h5>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ALERT_RADIUS_OPTIONS_KM.map((radius) => {
                            const isSelected = alertRadiusKm === radius;

                            return (
                              <button
                                key={radius}
                                type="button"
                                onClick={() => handleAlertRadiusSelect(radius)}
                                className={`inline-flex min-w-16 items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                                  isSelected
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
                                }`}
                                aria-pressed={isSelected}
                              >
                                {radius} {t("كم", "km")}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleEnableAvailabilityAlert}
                        disabled={alertSaving}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                      >
                        <span className="material-symbols-outlined text-sm">
                          notifications_active
                        </span>
                        <span>
                          {alertSaving
                            ? buttonText.enabling
                            : t("حفظ التنبيه", "Save alert")}
                        </span>
                      </button>
                    </div>
                  )}

                  {alertFeedback && (
                    <div
                      className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                        alertFeedback.type === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : alertFeedback.type === "warning"
                            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300"
                            : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/50 dark:bg-red-900/20 dark:text-red-300"
                      }`}
                    >
                      {alertFeedback.text}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2.5 px-4 pb-3 pt-4">
                  <div className="flex flex-wrap gap-2">
                    {summaryLabel && (
                      <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                        {summaryLabel}
                      </span>
                    )}
                    {hasAlertRadius && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {t(
                          `تنبيه ضمن ${alertRadiusKm} كم`,
                          `Alert within ${alertRadiusKm} km`,
                        )}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleEnableAvailabilityAlert}
                    disabled={alertSaving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                  >
                    <span className="material-symbols-outlined text-sm">
                      notifications_active
                    </span>
                    <span>
                      {alertSaving
                        ? buttonText.enabling
                        : buttonText.notifyNewMatches}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={recenterToActiveArea}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800/70"
                  >
                    <DynamicIcon iconName="RiUserLocationFill" size={18} />
                    <span>{buttonText.recenterArea}</span>
                  </button>

                  {alertFeedback && (
                    <div
                      className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                        alertFeedback.type === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : alertFeedback.type === "warning"
                            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300"
                            : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/50 dark:bg-red-900/20 dark:text-red-300"
                      }`}
                    >
                      {alertFeedback.text}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Location section */}
            {!isNearbyQuickMode && (
              <div className="border-t border-slate-100 px-4 py-4 dark:border-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t("موقعك", "Your location")}
                  </h4>
                  {userPosition && !isEditingLocation && (
                    <button
                      type="button"
                      onClick={handleOpenLocationEditor}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {buttonText.editLocation}
                    </button>
                  )}
                </div>

                {/* Current location display */}
                {userPosition && !isEditingLocation && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-700/50 dark:bg-emerald-900/20">
                    <span className="material-symbols-outlined shrink-0 text-[20px] text-emerald-600 dark:text-emerald-400">
                      location_on
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                        {t("موقعك محدد", "Location set")}
                      </p>
                      <p className="font-mono text-[11px] text-emerald-600/80 dark:text-emerald-400/70">
                        {userPosition[0].toFixed(5)}°&nbsp;&nbsp;
                        {userPosition[1].toFixed(5)}°
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locatingUser}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                >
                  <DynamicIcon iconName="RiUserLocationFill" size={18} />
                  <span>
                    {locatingUser
                      ? buttonText.locating
                      : buttonText.useCurrentLocation}
                  </span>
                </button>

                {locationError && (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
                    {locationError}
                  </p>
                )}

                {/* Inline mini map picker */}
                {isFilterPanelOpen && showLocationPicker && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tempPickerPos
                        ? t(
                            "يمكنك سحب العلامة أو النقر في مكان آخر لتعديل الموقع",
                            "Drag the pin or tap elsewhere to adjust",
                          )
                        : t(
                            "انقر على الخريطة لتحديد موقعك",
                            "Tap the map to set your location",
                          )}
                    </p>

                    <div
                      className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"
                      style={{ height: "200px" }}
                    >
                      <MapContainer
                        center={tempPickerPos ?? SYRIA_CENTER}
                        zoom={tempPickerPos ? 11 : 6}
                        style={{ height: "200px", width: "100%" }}
                        zoomControl={false}
                        scrollWheelZoom
                        attributionControl={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <ZoomControl position="bottomright" />
                        <ClickableLayer onPlace={handleTempPickerPlace} />
                        {tempPickerPos && (
                          <Marker
                            position={tempPickerPos}
                            icon={pickerMarkerIcon}
                            draggable
                            eventHandlers={{
                              dragend(e) {
                                const { lat, lng } = e.target.getLatLng();
                                setTempPickerPos([lat, lng]);
                              },
                            }}
                          />
                        )}
                      </MapContainer>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSavePickerLocation}
                        disabled={!tempPickerPos}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-base">
                          check
                        </span>
                        {buttonText.saveLocation}
                      </button>
                      {isEditingLocation && userPosition && (
                        <button
                          type="button"
                          onClick={handleCancelLocationEdit}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          {buttonText.cancel}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Alert radius */}
            {!isNearbyQuickMode && (
              <div className="border-t border-slate-100 px-4 py-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {buttonText.alertRadius}
                  </h4>
                  {hasAlertRadius && (
                    <button
                      type="button"
                      onClick={handleClearAlertRadius}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      {buttonText.clearRadius}
                    </button>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {t(
                    "اختر المسافة التي تريد أن يعتمدها التنبيه حول الموقع الذي حددته على الخارطة.",
                    "Choose the radius the alert should watch around the location you picked on the map.",
                  )}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {ALERT_RADIUS_OPTIONS_KM.map((radius) => {
                    const isSelected = alertRadiusKm === radius;

                    return (
                      <button
                        key={radius}
                        type="button"
                        onClick={() => handleAlertRadiusSelect(radius)}
                        className={`inline-flex min-w-16 items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
                        }`}
                        aria-pressed={isSelected}
                      >
                        {radius} {t("كم", "km")}
                      </button>
                    );
                  })}
                </div>

                {hasAlertRadius && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                    {t(
                      `سيتم إشعارك فقط عند توفر نتائج ضمن دائرة نصف قطرها ${alertRadiusKm} كم حول هذا الموقع.`,
                      `You will only be notified when results appear within a ${alertRadiusKm} km radius around this location.`,
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      <MapContainer
        center={userPosition ?? [0, 0]}
        zoom={13}
        style={{ height: "100vh", width: "100%" }}
        zoomControl={false}
        whenReady={handleMapReady}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ZoomControl position="bottomright" />

        <FitBounds
          items={visibleItems}
          userPosition={userPosition}
          radiusKm={hasAlertRadius ? alertRadiusKm : undefined}
        />

        {userPosition && (
          <>
            <Marker position={userPosition} icon={userIcon}>
              <Popup>
                <div className="min-w-40 space-y-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {t("موقعك الحالي", "Your current location")}
                  </div>
                  <div className="text-xs text-slate-600">
                    {hasAlertRadius
                      ? t(
                          `التنبيه مضبوط على نطاق ${alertRadiusKm} كم حول هذا الموقع`,
                          `Alerts are set for a ${alertRadiusKm} km radius around this location`,
                        )
                      : t(
                          "يتم ترتيب العناصر حسب قربها من هذا الموقع",
                          "Items are ordered by distance from this location",
                        )}
                  </div>
                </div>
              </Popup>
            </Marker>
            {hasAlertRadius && (
              <Circle
                center={userPosition}
                radius={alertRadiusKm * 1000}
                pathOptions={{
                  color: "#2563eb",
                  fillColor: "#60a5fa",
                  fillOpacity: 0.14,
                  weight: 2,
                }}
              />
            )}
          </>
        )}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={54}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          iconCreateFunction={createClusterIcon}
        >
          {visibleItems.map((item) => (
            <Marker
              key={item.id}
              position={[item.latitude, item.longitude]}
              icon={createListingIcon(Boolean(item.isFeatured))}
            >
              <Popup>
                <Link
                  href={buildListingDetailsPath({
                    id: item.id,
                    name: item.name,
                    city: item.city,
                    country: item.country,
                  })}
                  prefetch={false}
                  className="block w-56 cursor-pointer space-y-2"
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={224}
                    height={128}
                    className="h-28 w-full rounded-xl object-cover"
                  />
                  <div className="space-y-1">
                    <div className="line-clamp-2 text-sm font-semibold text-slate-900">
                      {item.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      {item.city && <span>{item.city}</span>}
                      {item.country && <span>{item.country}</span>}
                      {item.distanceKm !== null && userPosition && (
                        <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">
                          {item.distanceKm.toFixed(1)} {t("كم", "km")}
                        </span>
                      )}
                    </div>
                    {Number.isFinite(item.price) && (
                      <div className="text-sm font-bold text-slate-900">
                        {formatPrice(item.price, locale)}
                      </div>
                    )}
                    {item.address && (
                      <div className="line-clamp-2 text-xs text-slate-500">
                        {item.address}
                      </div>
                    )}
                  </div>
                </Link>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default MapClient;
