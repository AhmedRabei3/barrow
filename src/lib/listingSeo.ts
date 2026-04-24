import { $Enums } from "@prisma/client";

type SlugSource = string | null | undefined;

export const ITEM_TYPE_SEGMENTS: Record<$Enums.ItemType, string> = {
  PROPERTY: "properties",
  NEW_CAR: "new-cars",
  USED_CAR: "used-cars",
  HOME_FURNITURE: "home-furniture",
  MEDICAL_DEVICE: "medical-devices",
  OTHER: "other-items",
};

export const ITEM_TYPE_LABELS: Record<
  $Enums.ItemType,
  { ar: string; en: string }
> = {
  PROPERTY: { ar: "العقارات", en: "Properties" },
  NEW_CAR: { ar: "السيارات الجديدة", en: "New Cars" },
  USED_CAR: { ar: "السيارات المستعملة", en: "Used Cars" },
  HOME_FURNITURE: { ar: "الأثاث المنزلي", en: "Home Furniture" },
  MEDICAL_DEVICE: { ar: "الأجهزة الطبية", en: "Medical Devices" },
  OTHER: { ar: "المنوعات", en: "Other Items" },
};

export const slugifySeo = (...parts: SlugSource[]) => {
  const normalized = parts
    .filter(Boolean)
    .join(" ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "listing";
};

export const resolveListingTitle = (input: {
  title?: string | null;
  name?: string | null;
  brand?: string | null;
  model?: string | null;
}) => {
  const primary = input.title || input.name;
  if (primary) {
    return primary;
  }

  const brandModel = [input.brand, input.model]
    .filter(Boolean)
    .join(" ")
    .trim();
  return brandModel || input.brand || "Listing";
};

export const buildListingSlug = (input: {
  title?: string | null;
  name?: string | null;
  brand?: string | null;
  model?: string | null;
  city?: string | null;
  country?: string | null;
}) => slugifySeo(resolveListingTitle(input), input.city, input.country);

export const buildListingDetailsPath = (input: {
  id: string;
  title?: string | null;
  name?: string | null;
  brand?: string | null;
  model?: string | null;
  city?: string | null;
  country?: string | null;
}) => `/items/details/${input.id}/${buildListingSlug(input)}`;

export const buildCategorySlug = (name: string) => slugifySeo(name);

export const buildCategoryLandingPath = (input: {
  type: $Enums.ItemType;
  categoryId: string;
  categoryName: string;
}) =>
  `/categories/${ITEM_TYPE_SEGMENTS[input.type]}/${input.categoryId}/${buildCategorySlug(input.categoryName)}`;

export const getItemTypeFromSegment = (segment: string) => {
  const match = Object.entries(ITEM_TYPE_SEGMENTS).find(
    ([, value]) => value === segment,
  );

  return (match?.[0] as $Enums.ItemType | undefined) ?? null;
};
