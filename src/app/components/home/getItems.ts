"use client";

import { Dispatch, SetStateAction } from "react";
import { request } from "@/app/utils/axios";
import { $Enums } from "@prisma/client";
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
}

export type RawItem = {
  id: string;
  type?: $Enums.ItemType;
  category?: { type?: $Enums.ItemType };
  name?: string;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  sellOrRent?: string;
  rentType?: string | null;
  images?: Array<{ url?: string }>;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    country?: string;
  } | null;
  ratingCount?: number;
  averageRating?: number;
  isFeatured?: boolean;
};

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
    },
    itemImages: i.images ?? [],
    itemLocation: i.location ? [i.location] : [],
    category: i.category,
    totalReviews: i.ratingCount ?? 0,
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
}: FetchItemsParams) => {
  const isEnglishUi =
    typeof window !== "undefined" &&
    ((document?.documentElement?.lang || "").toLowerCase().startsWith("en") ||
      (navigator?.language || "").toLowerCase().startsWith("en"));

  try {
    setLoading(true);
    /* إعداد البارامز التي ستضاف لعنوان البحث */
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
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

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const fetchWithRetry = async (attempt = 0) => {
      try {
        return await request.get(url, {
          signal: signal ?? undefined,
          timeout: 45000,
        });
      } catch (error) {
        const err = error as { code?: string; message?: string };
        const isTimeout =
          err.code === "ECONNABORTED" ||
          err.message?.toLowerCase().includes("timeout");
        const isNetworkError =
          err.code === "ERR_NETWORK" ||
          err.message?.toLowerCase().includes("network error");

        if (attempt < 1 && (isTimeout || isNetworkError)) {
          await sleep(800);
          return fetchWithRetry(attempt + 1);
        }

        throw error;
      }
    };

    const { data } = await fetchWithRetry();

    if (!data?.success) {
      setItems([]);
      setTotal(0);
      return;
    }
    setTotal(data.totalCount ?? data.totalItems ?? 0);

    /* توحيد شكل البيانات الواردة من قاعدة البيانات لسهولة التعامل معها */
    const formatted: FormattedItem[] = formatRawItems(
      (data.items || []) as RawItem[],
    );

    setItems(formatted);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === "CanceledError" || err.message === "canceled")
    ) {
      return;
    }
    console.error(err);
    toast.error(
      isEnglishUi
        ? "Failed to fetch data from server"
        : "فشل في جلب البيانات من السيرفر",
    );
    setItems([]);
    setTotal(0);
  } finally {
    setLoading(false);
  }
};
