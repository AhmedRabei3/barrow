"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { fetchItems, FormattedItem } from "../components/home/getItems";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";

const useItems = ({ page, limit }: { page: number; limit: number }) => {
  const { filters } = useSearchFilters(); // ← جلب الفلاتر

  const [items, setItems] = useState<FormattedItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const controllerRef = useRef<AbortController | null>(null);
  const requestFilters = useMemo(
    () => ({
      type: filters.type,
      catName: filters.catName,
      q: filters.q,
      action: filters.action,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    }),
    [
      filters.type,
      filters.catName,
      filters.q,
      filters.action,
      filters.minPrice,
      filters.maxPrice,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setCoords(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }, []);

  useEffect(() => {
    // إلغاء الطلب السابق إن وجد
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    // طلب العناصر مع الفلاتر
    fetchItems({
      ...requestFilters,
      page,
      limit,
      latitude: coords?.lat,
      longitude: coords?.lng,
      setItems,
      setTotal: setTotalItems,
      setLoading,
      signal: controller.signal,
    });

    return () => controller.abort();
  }, [requestFilters, page, limit, coords?.lat, coords?.lng, refreshSeed]);

  const refetch = useCallback(() => {
    setRefreshSeed((prev) => prev + 1);
  }, []);

  return { items, totalItems, loading, refetch };
};

export default useItems;
