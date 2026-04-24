import toast from "react-hot-toast";

type DeleteSuccessHandler = () => Promise<void> | void;

type RawProfileItem = {
  id?: string;
  brand?: string;
  name?: string;
  model?: string;
  title?: string;
  year?: number | null;
  price?: number;
  sellOrRent?: string;
  rentType?: string | null;
  status?: string | null;
  moderationAction?: string | null;
  moderationNote?: string | null;
  moderatedAt?: string | Date | null;
  location?: unknown;
  isNew?: boolean;
  isFeatured?: boolean;
  type?: string | null;
  category?: { type?: string | null };
  ownerId?: string | null;
  userId?: string | null;
  reviews?: unknown[];
  reviewsCount?: number;
  totalReviews?: number;
  averageRating?: number | null;
  item?: Partial<RawProfileItem> & { id?: string };
  images?: Array<{
    url?: string | null;
    imageUrl?: string | null;
    path?: string | null;
  }>;
  itemImages?: Array<{
    url?: string | null;
    imageUrl?: string | null;
    path?: string | null;
  }>;
  itemLocation?: unknown[];
};

export const toGrandItem = (it: RawProfileItem | null | undefined) => {
  const rawImages = it?.images ?? it?.itemImages ?? [];

  const normalizedImages = Array.isArray(rawImages)
    ? rawImages
        .map((img) => ({
          url: img?.url ?? img?.imageUrl ?? img?.path ?? null,
        }))
        .filter((img) => typeof img.url === "string" && img.url.length > 0)
    : [];

  return {
    item: it?.item ?? {
      ...it,
      id: it?.id,
      brand: it?.brand ?? it?.name ?? "",
      model: it?.model ?? it?.title ?? "",
      year: it?.year ?? null,
      price: it?.price ?? 0,
      sellOrRent: it?.sellOrRent ?? "SELL",
      rentType: it?.rentType,
      status: it?.status ?? null,
      moderationAction: it?.moderationAction ?? null,
      moderationNote: it?.moderationNote ?? null,
      moderatedAt:
        it?.moderatedAt instanceof Date
          ? it.moderatedAt.toISOString()
          : (it?.moderatedAt ?? null),
      location: it?.location ?? null,
      isNew: it?.isNew ?? false,
      isFeatured: it?.isFeatured ?? false,
    },
    itemImages: normalizedImages,
    itemReviews: it?.reviews ?? [],
    itemLocation: it?.location ? [it.location] : (it?.itemLocation ?? []),
    totalReviews: it?.reviewsCount ?? it?.totalReviews ?? 0,
    averageRating: it?.averageRating ?? null,
    category: it?.category ?? { type: it?.type ?? null },
    ownerId: it?.ownerId ?? it?.userId ?? null,
  };
};

// delete item handler
export const handleConfirmDelete = async (
  itemIdToDelete: string,
  setDeleting: (value: boolean) => void,
  refetch: () => Promise<void>,
  setItemIdToDelete: (value: string | null) => void,
  onDeleteSuccess?: DeleteSuccessHandler,
) => {
  if (!itemIdToDelete) return;

  setDeleting(true);
  const controller = new AbortController();
  try {
    const res = await fetch(`/api/items/delete/${itemIdToDelete}`, {
      method: "DELETE",
      signal: controller.signal,
    });
    if (!res.ok) {
      toast.error("فشل حذف العنصر");
    } else {
      toast.success("تم الحذف بنجاح");
      await onDeleteSuccess?.();
      await refetch();
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("Delete aborted");
    } else {
      console.error("Delete request error", err);
      toast.error("حدث خطأ أثناء الحذف");
    }
  } finally {
    setDeleting(false);
    setItemIdToDelete(null);
  }
};
