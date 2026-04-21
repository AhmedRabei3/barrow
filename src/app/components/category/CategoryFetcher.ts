import { request } from "@/app/utils/axios";
import type { CategoryItem, ItemType } from "./types";

interface fetchCategoryProps<TCategory extends CategoryItem = CategoryItem> {
  type?: ItemType | null | undefined;
  withItemsOnly?: boolean;
  setList?: React.Dispatch<React.SetStateAction<TCategory[]>>;
}

const categoriesCache = new Map<string, CategoryItem[]>();

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
    const cached = categoriesCache.get(cacheKey);

    if (cached) {
      setList?.(cached as TCategory[]);
      return cached as TCategory[];
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

      categoriesCache.set(cacheKey, formatted);
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
