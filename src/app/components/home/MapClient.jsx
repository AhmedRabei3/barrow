"use client";

import {
  Circle,
  ZoomControl,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import Link from "next/link";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { buildListingDetailsPath } from "@/lib/listingSeo";
import Image from "next/image";
import DistanceFilter from "../filters/DistanceFilter";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";

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
      const bounds = L.circle(userPosition, {
        radius: radiusKm * 1000,
      }).getBounds();

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

const MapClient = ({ setShowMap, items }) => {
  const { isArabic } = useAppPreferences();
  const { filters } = useSearchFilters();
  const t = (ar, en) => (isArabic ? ar : en);
  const locale = isArabic ? "ar" : "en";
  const [mapInstance, setMapInstance] = useState(null);
  const userPosition = useMemo(
    () =>
      filters.userLat !== null && filters.userLng !== null
        ? [filters.userLat, filters.userLng]
        : null,
    [filters.userLat, filters.userLng],
  );
  const distanceKm = Number(filters.distance);
  const hasDistanceFilter = Number.isFinite(distanceKm) && distanceKm > 0;

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

  const visibleItems = useMemo(() => {
    if (!userPosition || !hasDistanceFilter) {
      return itemsWithDistance;
    }

    return itemsWithDistance.filter(
      (item) => item.distanceKm !== null && item.distanceKm <= distanceKm,
    );
  }, [distanceKm, hasDistanceFilter, itemsWithDistance, userPosition]);

  const summaryLabel = hasDistanceFilter
    ? t(
        `${visibleItems.length} عنصر ضمن ${distanceKm} كم`,
        `${visibleItems.length} items within ${distanceKm} km`,
      )
    : t(`${items.length} عنصر على الخريطة`, `${items.length} items on the map`);

  const helperLabel = !userPosition
    ? t(
        "اختر مسافة لتفعيل موقعك ثم تقريب الخريطة حولك",
        "Choose a distance to enable your location and focus the map around you",
      )
    : hasDistanceFilter
      ? t(
          "الخريطة الآن مركزة على نطاق البحث والعناصر الأقرب إليك",
          "The map is now focused on your search radius and the nearest items",
        )
      : t(
          "يمكنك اختيار مسافة لتضييق النتائج وإظهار محيطك مباشرة",
          "Pick a distance to narrow results and frame your nearby area",
        );

  const handleMapReady = useCallback((event) => {
    setMapInstance(event.target);
  }, []);

  const recenterToActiveArea = useCallback(() => {
    if (!mapInstance) return;

    if (userPosition && hasDistanceFilter) {
      const bounds = L.circle(userPosition, {
        radius: distanceKm * 1000,
      }).getBounds();

      visibleItems.forEach((item) => {
        bounds.extend([item.latitude, item.longitude]);
      });

      mapInstance.fitBounds(bounds, {
        padding: [70, 70],
        maxZoom: getZoomForDistance(distanceKm),
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
  }, [distanceKm, hasDistanceFilter, mapInstance, userPosition, visibleItems]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-sm">
      <div className="absolute inset-x-3 top-3 z-1000 rounded-3xl border border-white/70 bg-white/92 p-3 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/92 md:inset-x-6 md:top-6 md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                {summaryLabel}
              </span>
              {hasDistanceFilter && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {t("نطاق محدد", "Focused radius")}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white md:text-lg">
              {t("استكشف العناصر على الخريطة", "Explore listings on the map")}
            </h2>
            <p className="max-w-2xl text-xs text-slate-600 dark:text-slate-300 md:text-sm">
              {helperLabel}
            </p>
          </div>

          <button
            onClick={() => setShowMap(false)}
            aria-label={t("إغلاق الخريطة", "Close map")}
            className="inline-flex items-center justify-center self-start rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            type="button"
          >
            {t("إغلاق الخريطة", "Close map")}
          </button>
        </div>

        <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-950/40">
          <DistanceFilter />
        </div>

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={recenterToActiveArea}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
          >
            <span className="material-symbols-outlined text-sm">
              my_location
            </span>
            <span>{t("إعادة التمركز", "Recenter")}</span>
          </button>
        </div>
      </div>

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
          radiusKm={hasDistanceFilter ? distanceKm : undefined}
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
                    {hasDistanceFilter
                      ? t(
                          `يتم التركيز على نطاق ${distanceKm} كم من موقعك`,
                          `Focusing on a ${distanceKm} km radius around you`,
                        )
                      : t(
                          "اختر مسافة لإظهار نطاق البحث حولك",
                          "Choose a distance to show your search radius",
                        )}
                  </div>
                </div>
              </Popup>
            </Marker>
            {hasDistanceFilter && (
              <Circle
                center={userPosition}
                radius={distanceKm * 1000}
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

      {userPosition && hasDistanceFilter && visibleItems.length === 0 && (
        <div className="absolute bottom-6 left-1/2 z-1000 w-[min(92vw,34rem)] -translate-x-1/2 rounded-2xl border border-amber-200 bg-white/95 px-4 py-3 text-center shadow-xl dark:border-amber-800 dark:bg-slate-900/95">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {t(
              "لا توجد عناصر ضمن هذه المسافة في النتائج الحالية",
              "No items found within this distance in the current results",
            )}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {t(
              "جرّب توسيع المسافة أو إزالة بعض الفلاتر الأخرى لعرض نطاق أوسع",
              "Try a wider distance or clear some other filters to show a broader area",
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default MapClient;
