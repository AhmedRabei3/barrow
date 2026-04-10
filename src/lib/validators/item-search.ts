import { $Enums } from "@prisma/client";
import { z } from "zod";
import type { ItemSearchQueryDto } from "@/features/items/types";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).optional());

const optionalFiniteNumber = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}, z.number().finite().optional());

const optionalNullableFiniteNumber = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}, z.number().finite().nullable());

const itemSearchQuerySchema = z
  .object({
    q: optionalTrimmedString.default(""),
    type: z.nativeEnum($Enums.ItemType).nullable().optional(),
    city: optionalTrimmedString,
    country: optionalTrimmedString,
    catName: optionalTrimmedString,
    action: optionalTrimmedString,
    minPrice: optionalFiniteNumber,
    maxPrice: optionalFiniteNumber,
    lat: optionalNullableFiniteNumber.default(null),
    lng: optionalNullableFiniteNumber.default(null),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .transform<ItemSearchQueryDto>((value) => ({
    q: value.q,
    type: value.type ?? null,
    city: value.city,
    country: value.country,
    catName: value.catName,
    action: value.action,
    minPrice: value.minPrice,
    maxPrice: value.maxPrice,
    userLat: value.lat,
    userLng: value.lng,
    page: value.page,
    limit: value.limit,
  }));

export function parseItemSearchQuery(
  searchParams: URLSearchParams,
): ItemSearchQueryDto {
  return itemSearchQuerySchema.parse(
    Object.fromEntries(searchParams.entries()),
  );
}
