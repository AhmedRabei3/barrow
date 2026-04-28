"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { fetchItems, FormattedItem } from "../components/home/getItems";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";

type CacheQueryKey = {
  type?: string;
  catName?: string;
  q?: string;
  action?: string;
  city?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  page: number;
  limit: number;
  latitude: number | null;
  longitude: number | null;
};

type ItemsCacheSnapshot = { items: FormattedItem[]; totalItems: number };

const itemsCache = new Map<string, ItemsCacheSnapshot>();

const ITEMS_CACHE_STORAGE_PREFIX = "barrow:items-cache:";
let itemsCacheHydrated = false;

const fallbackCacheIndex = new Map<
  string,
  { items: FormattedItem[]; totalItems: number }
>();

const persistItemsSnapshot = (
  cacheKey: string,
  snapshot: ItemsCacheSnapshot,
) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      `${ITEMS_CACHE_STORAGE_PREFIX}${cacheKey}`,
      JSON.stringify(snapshot),
    );
  } catch {
    // Ignore storage failures (private mode/quota exceeded).
  }
};

const hydrateItemsCacheFromSessionStorage = () => {
  if (itemsCacheHydrated || typeof window === "undefined") {
    return;
  }

  itemsCacheHydrated = true;

  try {
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key?.startsWith(ITEMS_CACHE_STORAGE_PREFIX)) {
        continue;
      }

      const payload = window.sessionStorage.getItem(key);
      if (!payload) {
        continue;
      }

      const parsed = JSON.parse(payload) as unknown;
      if (!parsed || typeof parsed !== "object") {
        continue;
      }

      const maybeItems = (parsed as { items?: unknown }).items;
      const maybeTotal = (parsed as { totalItems?: unknown }).totalItems;
      if (!Array.isArray(maybeItems) || typeof maybeTotal !== "number") {
        continue;
      }

      const cacheKey = key.slice(ITEMS_CACHE_STORAGE_PREFIX.length);
      itemsCache.set(cacheKey, {
        items: maybeItems as FormattedItem[],
        totalItems: maybeTotal,
      });
    }
  } catch {
    // Ignore malformed session storage payloads.
  }
};

const normalizeCategoryName = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase();

const normalizeComparableValue = (value: string | number | undefined) =>
  value === undefined || value === null ? "" : String(value).trim();

const normalizeComparableText = (value: string | undefined) =>
  normalizeComparableValue(value).toLowerCase();

const getItemCategoryName = (item: FormattedItem) =>
  normalizeCategoryName(item.category?.name);

const getItemType = (item: FormattedItem) =>
  normalizeComparableText(item.item.type ?? item.category?.type);

const isAllCategory = (value: string | undefined) =>
  !normalizeCategoryName(value) || normalizeCategoryName(value) === "all";

const isAllType = (value: string | undefined) => {
  const normalizedValue = normalizeComparableText(value);
  return !normalizedValue || normalizedValue === "all";
};

const matchesTargetCategory = (item: FormattedItem, targetCategory: string) => {
  if (!targetCategory || targetCategory === "all") {
    return true;
  }

  return getItemCategoryName(item) === targetCategory;
};

const matchesTargetType = (item: FormattedItem, targetType: string) => {
  if (!targetType || targetType === "all") {
    return true;
  }

  return getItemType(item) === targetType;
};

const buildFallbackIndexKey = (targetQuery: CacheQueryKey) =>
  JSON.stringify({
    type: normalizeComparableText(targetQuery.type),
    catName: normalizeCategoryName(targetQuery.catName),
    q: normalizeComparableText(targetQuery.q),
    action: normalizeComparableText(targetQuery.action),
    city: normalizeComparableText(targetQuery.city),
    minPrice: normalizeComparableValue(targetQuery.minPrice),
    maxPrice: normalizeComparableValue(targetQuery.maxPrice),
    limit: targetQuery.limit,
    latitude: targetQuery.latitude,
    longitude: targetQuery.longitude,
    page: targetQuery.page,
  });

const isCompatibleCacheSource = (
  candidate: CacheQueryKey,
  target: CacheQueryKey,
) => {
  const candidateType = normalizeComparableText(candidate.type);
  const targetType = normalizeComparableText(target.type);
  const candidateCategory = normalizeCategoryName(candidate.catName);
  const targetCategory = normalizeCategoryName(target.catName);

  return (
    candidate.limit === target.limit &&
    candidate.latitude === target.latitude &&
    candidate.longitude === target.longitude &&
    normalizeComparableText(candidate.q) ===
      normalizeComparableText(target.q) &&
    normalizeComparableText(candidate.action) ===
      normalizeComparableText(target.action) &&
    normalizeComparableText(candidate.city) ===
      normalizeComparableText(target.city) &&
    normalizeComparableValue(candidate.q) ===
      normalizeComparableValue(target.q) &&
    normalizeComparableValue(candidate.minPrice) ===
      normalizeComparableValue(target.minPrice) &&
    normalizeComparableValue(candidate.maxPrice) ===
      normalizeComparableValue(target.maxPrice) &&
    (candidateType === targetType || isAllType(candidate.type)) &&
    (candidateCategory === targetCategory || isAllCategory(candidate.catName))
  );
};

const buildLocalCategorySnapshot = (
  requestKey: string,
  targetQuery: CacheQueryKey,
) => {
  const normalizedTargetCategory = normalizeCategoryName(targetQuery.catName);
  const normalizedTargetType = normalizeComparableText(targetQuery.type);
  const fallbackIndexKey = buildFallbackIndexKey(targetQuery);
  const indexedSnapshot = fallbackCacheIndex.get(fallbackIndexKey);
  if (indexedSnapshot) {
    return indexedSnapshot;
  }

  if (
    (!normalizedTargetCategory || normalizedTargetCategory === "all") &&
    (!normalizedTargetType || normalizedTargetType === "all")
  ) {
    return null;
  }

  const matchedItems = new Map<string, FormattedItem>();
  let estimatedTotalItems = 0;

  for (const [cacheKey, snapshot] of itemsCache.entries()) {
    if (cacheKey === requestKey) continue;

    let parsedKey: CacheQueryKey;
    try {
      parsedKey = JSON.parse(cacheKey) as CacheQueryKey;
    } catch {
      continue;
    }

    if (!isCompatibleCacheSource(parsedKey, targetQuery)) {
      continue;
    }

    if (parsedKey.page > targetQuery.page) {
      continue;
    }

    estimatedTotalItems = Math.max(estimatedTotalItems, snapshot.totalItems);

    for (const item of snapshot.items) {
      if (!matchesTargetCategory(item, normalizedTargetCategory)) {
        continue;
      }

      if (!matchesTargetType(item, normalizedTargetType)) {
        continue;
      }

      matchedItems.set(item.item.id, item);
    }
  }

  const items = Array.from(matchedItems.values());
  if (!items.length) {
    return null;
  }

  const visibleItems = items.slice(0, targetQuery.limit * targetQuery.page);

  const snapshot = {
    items: visibleItems,
    totalItems: Math.max(estimatedTotalItems, visibleItems.length),
  };

  fallbackCacheIndex.set(fallbackIndexKey, snapshot);

  return snapshot;
};

const clearFallbackCacheIndex = () => {
  fallbackCacheIndex.clear();
};

export const clearItemsCache = () => {
  itemsCache.clear();
  clearFallbackCacheIndex();

  if (typeof window === "undefined") {
    return;
  }

  try {
    const keysToDelete: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(ITEMS_CACHE_STORAGE_PREFIX)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      window.sessionStorage.removeItem(key);
    });
  } catch {
    // Ignore storage access failures.
  }
};

const useItems = ({ page, limit }: { page: number; limit: number }) => {
  const { filters } = useSearchFilters(); // ← جلب الفلاتر

  const requestFilters = useMemo(
    () => ({
      type: filters.type,
      catName: filters.catName,
      q: filters.q,
      action: filters.action,
      city: filters.city,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    }),
    [
      filters.type,
      filters.catName,
      filters.q,
      filters.action,
      filters.city,
      filters.minPrice,
      filters.maxPrice,
    ],
  );
  const requestKey = useMemo(
    () =>
      JSON.stringify({
        ...requestFilters,
        page,
        limit,
        latitude: null,
        longitude: null,
      }),
    [requestFilters, page, limit],
  );
  const requestQuery = useMemo<CacheQueryKey>(
    () => ({
      ...requestFilters,
      page,
      limit,
      latitude: null,
      longitude: null,
    }),
    [requestFilters, page, limit],
  );

  const initialSnapshot = useMemo(() => {
    hydrateItemsCacheFromSessionStorage();

    return (
      itemsCache.get(requestKey) ??
      buildLocalCategorySnapshot(requestKey, requestQuery)
    );
  }, [requestKey, requestQuery]);

  const [items, setItems] = useState<FormattedItem[]>(
    () => initialSnapshot?.items ?? [],
  );
  const [totalItems, setTotalItems] = useState(
    () => initialSnapshot?.totalItems ?? 0,
  );
  const [loading, setLoading] = useState(() => !Boolean(initialSnapshot));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSeed, setRefreshSeed] = useState(0);

  const controllerRef = useRef<AbortController | null>(null);
  const itemsRef = useRef<FormattedItem[]>(initialSnapshot?.items ?? []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    hydrateItemsCacheFromSessionStorage();

    // إلغاء الطلب السابق إن وجد
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const cachedSnapshot =
      itemsCache.get(requestKey) ??
      buildLocalCategorySnapshot(requestKey, requestQuery);
    if (cachedSnapshot) {
      setItems(cachedSnapshot.items);
      setTotalItems(cachedSnapshot.totalItems);
    }

    const keepPreviousData =
      Boolean(cachedSnapshot) || itemsRef.current.length > 0;

    // طلب العناصر مع الفلاتر
    void (async () => {
      const result = await fetchItems({
        ...requestFilters,
        page,
        limit,
        setItems,
        setTotal: setTotalItems,
        setLoading,
        setRefreshing: setIsRefreshing,
        keepPreviousData,
        signal: controller.signal,
      });

      if (result) {
        const nextSnapshot = {
          items: result.items,
          totalItems: result.totalCount,
        };
        itemsCache.set(requestKey, nextSnapshot);
        persistItemsSnapshot(requestKey, nextSnapshot);
        clearFallbackCacheIndex();
      }
    })();

    return () => controller.abort();
  }, [requestFilters, requestKey, requestQuery, page, limit, refreshSeed]);

  const refetch = useCallback(() => {
    setRefreshSeed((prev) => prev + 1);
  }, []);

  return { items, totalItems, loading, isRefreshing, refetch };
};

export default useItems;
