import type { $Enums } from "@prisma/client";

export type ItemSearchQueryDto = {
  q: string;
  type: $Enums.ItemType | null;
  city?: string;
  country?: string;
  catName?: string;
  action?: string;
  minPrice?: number;
  maxPrice?: number;
  userLat: number | null;
  userLng: number | null;
  page: number;
  limit: number;
};

export type ItemLocationDto = {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
} | null;

export type ItemSearchItemDto = {
  id: string;
  type: $Enums.ItemType;
  category?: {
    id?: string;
    name?: string;
    type?: $Enums.ItemType;
  } | null;
  location?: ItemLocationDto;
  images?: Array<{ url: string }>;
  reviewsCount?: number;
  averageRating?: number | null;
  createdAt?: Date | string | null;
  featuredAt?: string | null;
  isFeatured?: boolean;
  title?: string;
  name?: string;
  brand?: string | null;
  model?: string | null;
  year?: number;
  price?: number;
  sellOrRent?: string;
  rentType?: string | null;
  status?: string;
  description?: string | null;
  guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  livingrooms?: number;
  kitchens?: number;
  area?: number;
  floor?: number;
  elvator?: boolean;
  petAllowed?: boolean;
  furnished?: boolean;
  color?: string | null;
  fuelType?: string | null;
  gearType?: string | null;
  mileage?: number;
  reAssembled?: boolean;
  repainted?: boolean;
};

export type ItemSearchResponseDto = {
  success: true;
  page: number;
  limit: number;
  totalCount: number;
  items: ItemSearchItemDto[];
};
