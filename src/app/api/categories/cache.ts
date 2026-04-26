type CategoryResponseSnapshot = {
  expiresAt: number;
  staleUntil: number;
  value: unknown;
};

type ActiveCategoryIdsSnapshot = {
  expiresAt: number;
  staleUntil: number;
  value: string[];
};

const categoriesResponseCache = new Map<string, CategoryResponseSnapshot>();
const activeCategoryIdsCache = new Map<string, ActiveCategoryIdsSnapshot>();

export const getCategoriesResponseSnapshot = (cacheKey: string) =>
  categoriesResponseCache.get(cacheKey);

export const setCategoriesResponseSnapshot = (
  cacheKey: string,
  snapshot: CategoryResponseSnapshot,
) => {
  categoriesResponseCache.set(cacheKey, snapshot);
};

export const deleteCategoriesResponseSnapshot = (cacheKey: string) => {
  categoriesResponseCache.delete(cacheKey);
};

export const getActiveCategoryIdsSnapshot = (cacheKey: string) =>
  activeCategoryIdsCache.get(cacheKey);

export const setActiveCategoryIdsSnapshot = (
  cacheKey: string,
  snapshot: ActiveCategoryIdsSnapshot,
) => {
  activeCategoryIdsCache.set(cacheKey, snapshot);
};

export const deleteActiveCategoryIdsSnapshot = (cacheKey: string) => {
  activeCategoryIdsCache.delete(cacheKey);
};

export const clearCategoriesRouteCache = () => {
  categoriesResponseCache.clear();
  activeCategoryIdsCache.clear();
};
