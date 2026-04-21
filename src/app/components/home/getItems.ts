"use client";

import { Dispatch, SetStateAction } from "react";
import { $Enums } from "@prisma/client";
import type {
  ItemSearchItemDto,
  ItemSearchResponseDto,
} from "@/features/items/types";
import toast from "react-hot-toast";

interface FetchItemsParams {
  catName?: string;
  type?: $Enums.ItemType | "ALL";
  page: number;
  limit: number;
  setItems: Dispatch<SetStateAction<FormattedItem[]>>;
  setTotal: Dispatch<SetStateAction<number>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  action?: string;
  city?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  q?: string;
  latitude?: number;
  longitude?: number;
  signal?: AbortSignal;
  keepPreviousData?: boolean;
  setRefreshing?: Dispatch<SetStateAction<boolean>>;
}

export type RawItem = ItemSearchItemDto;

type FetchItemsResponse =
  | ItemSearchResponseDto
  | { success?: false; message?: string };

const MAX_ITEMS_LIMIT = 50;

export type FormattedItem = {
  item: {
    id: string;
    type?: $Enums.ItemType;
    name: string;
    brand: string;
    model: string;
    year?: number;
    price: number;
    sellOrRent: string;
    rentType: string | null;
    isFeatured?: boolean;
    // Property-specific
    bedrooms?: number;
    bathrooms?: number;
    guests?: number;
    livingrooms?: number;
    kitchens?: number;
    area?: number;
    floor?: number;
    furnished?: boolean;
    petAllowed?: boolean;
    elvator?: boolean;
    // Car-specific
    color?: string;
    fuelType?: string;
    gearType?: string;
    mileage?: number;
    repainted?: boolean;
    reAssembled?: boolean;
  };
  itemImages: Array<{ url?: string }>;
  itemLocation: RawItem["location"][];
  category?: { type?: $Enums.ItemType };
  totalReviews: number;
  averageRating: number;
};

export const formatRawItems = (rawItems: RawItem[]): FormattedItem[] =>
  rawItems.map((i) => ({
    item: {
      id: i.id,
      type: i.type ?? i.category?.type,
      name: i.name ?? "",
      brand: i.brand ?? i.title ?? "",
      model: i.model ?? "",
      year: i.year,
      price: i.price ?? 0,
      sellOrRent: i.sellOrRent ?? "SELL",
      rentType: i.rentType ?? null,
      isFeatured: Boolean(i.isFeatured),
      // Property-specific
      bedrooms: i.bedrooms,
      bathrooms: i.bathrooms,
      guests: i.guests,
      livingrooms: i.livingrooms,
      kitchens: i.kitchens,
      area: i.area,
      floor: i.floor,
      furnished: i.furnished,
      petAllowed: i.petAllowed,
      elvator: i.elvator,
      // Car-specific
      color: i.color ?? undefined,
      fuelType: i.fuelType ?? undefined,
      gearType: i.gearType ?? undefined,
      mileage: i.mileage,
      repainted: i.repainted,
      reAssembled: i.reAssembled,
    },
    itemImages: i.images ?? [],
    itemLocation: i.location ? [i.location] : [],
    category: i.category ?? undefined,
    totalReviews: i.reviewsCount ?? 0,
    averageRating: i.averageRating ?? 0,
  }));

export const fetchItems = async ({
  catName,
  type,
  page,
  limit,
  action,
  city,
  minPrice,
  maxPrice,
  q,
  latitude,
  longitude,
  setItems,
  setTotal,
  setLoading,
  signal = undefined,
  keepPreviousData = false,
  setRefreshing,
}: FetchItemsParams) => {
  const isEnglishUi =
    typeof window !== "undefined" &&
    ((document?.documentElement?.lang || "").toLowerCase().startsWith("en") ||
      (navigator?.language || "").toLowerCase().startsWith("en"));
  const locale = isEnglishUi ? "en" : "ar";
  const normalizedLimit = Math.min(
    Math.max(Math.floor(limit || 1), 1),
    MAX_ITEMS_LIMIT,
  );

  try {
    if (keepPreviousData) {
      setRefreshing?.(true);
    } else {
      setLoading(true);
    }
    /* إعداد البارامز التي ستضاف لعنوان البحث */
    const params = new URLSearchParams({
      page: String(page),
      limit: String(normalizedLimit),
    });

    if (catName && catName !== "All") params.append("catName", catName);
    if (type && type !== "ALL") params.append("type", type);
    if (action) params.append("action", action);
    if (city) params.append("city", city);
    if (minPrice !== undefined && minPrice !== "" && minPrice !== null)
      params.append("minPrice", String(minPrice));
    if (maxPrice !== undefined && maxPrice !== "" && maxPrice !== null)
      params.append("maxPrice", String(maxPrice));
    if (q) params.append("q", q);
    if (Number.isFinite(latitude)) params.append("lat", String(latitude));
    if (Number.isFinite(longitude)) params.append("lng", String(longitude));
    /* هنا لا يوجد لدينا مودل اسمه كار لذلك وهو موجود ضمن الأنواع فاستخدمناه لحذف باراميترات البحث من أجل جلب كل العناصر  */

    if (type === "ALL") {
      params.delete("catName");
      params.delete("type");
      params.delete("city");
      params.delete("minPrice");
      params.delete("maxPrice");
    }

    const url = `/api/items?${params.toString()}`;

    const timeoutController = new AbortController();
    const timeoutId = window.setTimeout(() => timeoutController.abort(), 8000);

    const requestSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        signal: requestSignal,
        headers: {
          "x-lang": locale,
          "Accept-Language": locale,
        },
        credentials: "include",
        cache: "no-store",
      });
    } finally {
      window.clearTimeout(timeoutId);
    }

    const data = (await response.json()) as FetchItemsResponse;
    const responseMessage =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "";

    if (!response.ok) {
      throw new Error(
        responseMessage
          ? responseMessage
          : isEnglishUi
            ? "Failed to fetch data from server"
            : "فشل في جلب البيانات من السيرفر",
      );
    }

    if (!data?.success) {
      if (!keepPreviousData) {
        setItems([]);
        setTotal(0);
      }
      return null;
    }
    setTotal(data.totalCount ?? 0);

    /* توحيد شكل البيانات الواردة من قاعدة البيانات لسهولة التعامل معها */
    const formatted: FormattedItem[] = formatRawItems(
      (data.items || []) as RawItem[],
    );

    setItems(formatted);
    return {
      items: formatted,
      totalCount: data.totalCount ?? 0,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    const isAbortError =
      (err instanceof Error &&
        (err.name === "AbortError" ||
          err.name === "CanceledError" ||
          err.message === "canceled" ||
          err.message === "signal is aborted without reason")) ||
      signal?.aborted === true;

    if (isAbortError) {
      return;
    }

    console.error(err);
    toast.error(
      message ||
        (isEnglishUi
          ? "Failed to fetch data from server"
          : "فشل في جلب البيانات من السيرفر"),
    );
    if (!keepPreviousData) {
      setItems([]);
      setTotal(0);
    }
    return null;
  } finally {
    if (keepPreviousData) {
      setRefreshing?.(false);
    } else {
      setLoading(false);
    }
  }
};
