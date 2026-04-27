import { request } from "@/app/utils/axios";
import type { CategoryItem, ItemType } from "./types";

interface fetchCategoryProps<TCategory extends CategoryItem = CategoryItem> {
  type?: ItemType | null | undefined;
  withItemsOnly?: boolean;
  signal?: AbortSignal;
  setList?: React.Dispatch<React.SetStateAction<TCategory[]>>;
}

type CategoryCacheEntry = {
  data: CategoryItem[];
  updatedAt: number;
};

const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;
const categoriesCache = new Map<string, CategoryCacheEntry>();
const CATEGORY_STORAGE_PREFIX = "barrow:categories:";

const normalizeType = (type?: ItemType | string | null) =>
  typeof type === "string" && type.trim().length > 0 ? type : undefined;

const buildCacheKey = (
  type?: ItemType | string | null,
  withItemsOnly?: boolean,
) => `${normalizeType(type) ?? "ALL"}:${withItemsOnly ? "WITH_ITEMS" : "ANY"}`;

const isFreshCacheEntry = (
  entry?: CategoryCacheEntry | null,
): entry is CategoryCacheEntry =>
  Boolean(entry && Date.now() - entry.updatedAt < CATEGORY_CACHE_TTL_MS);

const readPersistedCategories = (
  cacheKey: string,
): CategoryCacheEntry | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(
      `${CATEGORY_STORAGE_PREFIX}${cacheKey}`,
    );
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        data: parsed as CategoryItem[],
        updatedAt: 0,
      };
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("data" in parsed) ||
      !Array.isArray((parsed as { data?: unknown }).data)
    ) {
      return null;
    }

    return {
      data: (parsed as { data: CategoryItem[] }).data,
      updatedAt:
        typeof (parsed as { updatedAt?: unknown }).updatedAt === "number"
          ? Number((parsed as { updatedAt?: unknown }).updatedAt)
          : 0,
    };
  } catch {
    return null;
  }
};

const persistCategories = (cacheKey: string, entry: CategoryCacheEntry) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      `${CATEGORY_STORAGE_PREFIX}${cacheKey}`,
      JSON.stringify(entry),
    );
  } catch {
    // Ignore storage quota or privacy mode failures.
  }
};

export const clearCategoriesCache = () => {
  categoriesCache.clear();

  if (typeof window === "undefined") {
    return;
  }

  try {
    const keysToDelete: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(CATEGORY_STORAGE_PREFIX)) {
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

export const getCachedCategoriesSnapshot = ({
  type,
  withItemsOnly,
}: {
  type?: ItemType | string | null;
  withItemsOnly?: boolean;
}): CategoryItem[] | undefined => {
  const cacheKey = buildCacheKey(type, withItemsOnly);
  const inMemory = categoriesCache.get(cacheKey);
  if (isFreshCacheEntry(inMemory)) {
    return inMemory?.data;
  }

  const persisted = readPersistedCategories(cacheKey);
  if (isFreshCacheEntry(persisted)) {
    categoriesCache.set(cacheKey, persisted as CategoryCacheEntry);
    return persisted?.data;
  }

  return undefined;
};

const categoryFetcher = async <TCategory extends CategoryItem = CategoryItem>({
  type,
  withItemsOnly,
  signal,
  setList,
}: fetchCategoryProps<TCategory>) => {
  const normalizedType = normalizeType(type);
  const cacheKey = buildCacheKey(normalizedType, withItemsOnly);

  try {
    const cached = categoriesCache.get(cacheKey);

    if (isFreshCacheEntry(cached)) {
      setList?.((cached as CategoryCacheEntry).data as TCategory[]);
      return (cached as CategoryCacheEntry).data as TCategory[];
    }

    const persisted = readPersistedCategories(cacheKey);
    if (isFreshCacheEntry(persisted)) {
      categoriesCache.set(cacheKey, persisted);
      setList?.((persisted as CategoryCacheEntry).data as TCategory[]);
      return (persisted as CategoryCacheEntry).data as TCategory[];
    }

    const { data } = await request.get("/api/categories", {
      timeout: 8000,
      signal,
      params: {
        ...(normalizedType ? { type: normalizedType } : {}),
        ...(withItemsOnly ? { withItemsOnly: "true" } : {}),
      },
    });

    if (data.success && Array.isArray(data.data)) {
      const formatted: CategoryItem[] = data.data.map((cat: CategoryItem) => ({
        name: cat.name,
        nameAr: cat.nameAr ?? null,
        nameEn: cat.nameEn ?? null,
        icon: cat.icon,
        type: cat.type,
        id: cat.id,
        isDeleted:
          typeof (cat as { isDeleted?: unknown }).isDeleted === "boolean"
            ? Boolean((cat as { isDeleted?: unknown }).isDeleted)
            : false,
      }));

      const nextEntry: CategoryCacheEntry = {
        data: formatted,
        updatedAt: Date.now(),
      };

      categoriesCache.set(cacheKey, nextEntry);
      persistCategories(cacheKey, nextEntry);
      setList?.(formatted as TCategory[]);
      return formatted as TCategory[];
    }

    console.warn("Unexpected categories response:", data);
    return [];
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      const maybeResponse =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { status?: number; data?: unknown } })
              .response
          : undefined;

      console.warn("Category fetcher failed", {
        status: maybeResponse?.status,
        data: maybeResponse?.data,
      });
    }

    const staleFallback =
      categoriesCache.get(cacheKey)?.data ??
      readPersistedCategories(cacheKey)?.data;
    if (staleFallback?.length) {
      return staleFallback as TCategory[];
    }

    return [];
  }
};

export default categoryFetcher;
