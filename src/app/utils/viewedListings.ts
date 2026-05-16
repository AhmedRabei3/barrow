const VIEWED_LISTINGS_STORAGE_KEY = "barrow:viewed-listings";
const VIEWED_LISTINGS_UPDATED_EVENT = "barrow:viewed-listings-updated";
const VIEWED_LISTINGS_MAX = 500;

const normalizeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const ids: string[] = [];

  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id || seen.has(id)) continue;

    seen.add(id);
    ids.push(id);
  }

  return ids;
};

const readViewedListingIds = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(VIEWED_LISTINGS_STORAGE_KEY);
    if (!raw) return [];

    return normalizeIds(JSON.parse(raw));
  } catch {
    return [];
  }
};

const writeViewedListingIds = (ids: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeIds(ids).slice(-VIEWED_LISTINGS_MAX);
  window.localStorage.setItem(
    VIEWED_LISTINGS_STORAGE_KEY,
    JSON.stringify(normalized),
  );
};

const emitViewedListingsUpdated = (id: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(VIEWED_LISTINGS_UPDATED_EVENT, { detail: { id } }),
  );
};

export const markListingAsViewed = (id: string | null | undefined) => {
  const nextId = (id ?? "").trim();
  if (!nextId || typeof window === "undefined") {
    return;
  }

  const current = readViewedListingIds();
  if (current.includes(nextId)) {
    return;
  }

  writeViewedListingIds([...current, nextId]);
  emitViewedListingsUpdated(nextId);
};

export const isListingViewed = (id: string | null | undefined): boolean => {
  const nextId = (id ?? "").trim();
  if (!nextId) {
    return false;
  }

  return readViewedListingIds().includes(nextId);
};

export const subscribeViewedListings = (listener: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleCustom = () => listener();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === VIEWED_LISTINGS_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(VIEWED_LISTINGS_UPDATED_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(VIEWED_LISTINGS_UPDATED_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
};
