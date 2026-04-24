"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CacheEntry<TData> = {
  data: TData;
  updatedAt: number;
};

const staleResourceCache = new Map<string, CacheEntry<unknown>>();

const getCachedResource = <TData>(key: string): TData | undefined => {
  const cached = staleResourceCache.get(key);
  return cached ? (cached.data as TData) : undefined;
};

export const setCachedResource = <TData>(key: string, data: TData) => {
  staleResourceCache.set(key, {
    data,
    updatedAt: Date.now(),
  });
};

export const clearCachedResource = (key: string) => {
  staleResourceCache.delete(key);
};

export const clearCachedResourcesByPrefix = (prefix: string) => {
  for (const key of staleResourceCache.keys()) {
    if (key.startsWith(prefix)) {
      staleResourceCache.delete(key);
    }
  }
};

interface UseStaleResourceOptions<TData> {
  cacheKey: string;
  fetcher: (signal: AbortSignal) => Promise<TData>;
  enabled?: boolean;
  fallbackData?: TData;
  shouldResetDataOnError?: (error: unknown) => boolean;
}

export const useStaleResource = <TData>({
  cacheKey,
  fetcher,
  enabled = true,
  fallbackData,
  shouldResetDataOnError,
}: UseStaleResourceOptions<TData>) => {
  const cachedData = getCachedResource<TData>(cacheKey);
  const [data, setData] = useState<TData | undefined>(
    cachedData ?? fallbackData,
  );
  const [loading, setLoading] = useState(
    enabled && cachedData === undefined && fallbackData === undefined,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const dataRef = useRef<TData | undefined>(cachedData ?? fallbackData);
  const pendingResolversRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setIsRefreshing(false);
      pendingResolversRef.current.splice(0).forEach((resolve) => resolve());
      return;
    }

    const controller = new AbortController();
    const nextCachedData = getCachedResource<TData>(cacheKey);

    if (nextCachedData !== undefined) {
      setData(nextCachedData);
      setLoading(false);
    } else if (fallbackData !== undefined && dataRef.current === undefined) {
      setData(fallbackData);
    }

    setError(null);

    const hasVisibleData =
      nextCachedData !== undefined || dataRef.current !== undefined;

    if (hasVisibleData) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    void fetcher(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        setCachedResource(cacheKey, result);
        setData(result);
        setError(null);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (shouldResetDataOnError?.(fetchError)) {
          clearCachedResource(cacheKey);
          setData(undefined);
        }

        setError(fetchError);
      })
      .finally(() => {
        if (controller.signal.aborted) {
          return;
        }

        setLoading(false);
        setIsRefreshing(false);
        pendingResolversRef.current.splice(0).forEach((resolve) => resolve());
      });

    return () => controller.abort();
  }, [
    cacheKey,
    enabled,
    fallbackData,
    fetcher,
    refreshSeed,
    shouldResetDataOnError,
  ]);

  const refetch = useCallback(() => {
    return new Promise<void>((resolve) => {
      pendingResolversRef.current.push(resolve);
      setRefreshSeed((prev) => prev + 1);
    });
  }, []);

  const mutate = useCallback(
    (nextValue: TData | ((previous: TData | undefined) => TData)) => {
      setData((previous) => {
        const resolved =
          typeof nextValue === "function"
            ? (nextValue as (previous: TData | undefined) => TData)(previous)
            : nextValue;

        setCachedResource(cacheKey, resolved);
        return resolved;
      });
    },
    [cacheKey],
  );

  return {
    data,
    loading,
    isRefreshing,
    error,
    refetch,
    mutate,
  };
};
