import { $Enums } from "@prisma/client";

export type locRaw = {
  latitude: number | undefined;
  longitude: number | undefined;
  city: FormDataEntryValue | undefined;
  address: FormDataEntryValue | undefined;
  state: FormDataEntryValue;
  country: FormDataEntryValue;
};

export type GrandItem = {
  item: {
    id?: string;
    brand?: string | null;
    model?: string | null;
    year?: number | null;
    price?: number | null;
    sellOrRent?: $Enums.TransactionType | string | null;
    rentType?: $Enums.RentType | string | null;
    location?: unknown;
    isNew?: boolean;
    isFeatured?: boolean;
    type?: $Enums.ItemType | string | null;
  };
  ownerId?: string | null;
  itemImages: { url: string | null }[];
  itemReviews: unknown[];
  itemLocation: Array<{
    latitude?: number;
    longitude?: number;
    state?: string | null;
  }>;
  totalReviews: number;
  averageRating: number | null;
  category: { type?: string | null };
};
