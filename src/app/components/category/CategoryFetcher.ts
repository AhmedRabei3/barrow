import { request } from "@/app/utils/axios";
import type { CategoryItem, ItemType } from "./types";

interface fetchCategoryProps<TCategory extends CategoryItem = CategoryItem> {
  type?: ItemType | null | undefined;
  withItemsOnly?: boolean;
  setList?: React.Dispatch<React.SetStateAction<TCategory[]>>;
}

const categoriesCache = new Map<string, CategoryItem[]>();
const CATEGORY_STORAGE_PREFIX = "barrow:categories:";

const readPersistedCategories = (cacheKey: string): CategoryItem[] | null => {
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
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed as CategoryItem[];
  } catch {
    return null;
  }
};

const persistCategories = (cacheKey: string, categories: CategoryItem[]) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      `${CATEGORY_STORAGE_PREFIX}${cacheKey}`,
      JSON.stringify(categories),
    );
  } catch {
    // Ignore storage quota or privacy mode failures.
  }
};

export const clearCategoriesCache = () => {
  categoriesCache.clear();
};

const categoryFetcher = async <TCategory extends CategoryItem = CategoryItem>({
  type,
  withItemsOnly,
  setList,
}: fetchCategoryProps<TCategory>) => {
  try {
    const normalizedType =
      typeof type === "string" && type.trim().length > 0 ? type : undefined;
    const cacheKey = `${normalizedType ?? "ALL"}:${withItemsOnly ? "WITH_ITEMS" : "ANY"}`;
    const useLocalCache = !withItemsOnly;
    const cached = useLocalCache ? categoriesCache.get(cacheKey) : undefined;

    if (cached) {
      setList?.(cached as TCategory[]);
      return cached as TCategory[];
    }

    const persisted = useLocalCache ? readPersistedCategories(cacheKey) : null;
    if (persisted?.length) {
      categoriesCache.set(cacheKey, persisted);
      setList?.(persisted as TCategory[]);
    }

    const { data } = await request.get("/api/categories", {
      timeout: 8000,
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

      if (useLocalCache) {
        categoriesCache.set(cacheKey, formatted);
        persistCategories(cacheKey, formatted);
      }
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

    return [];
  }
};

export default categoryFetcher;
