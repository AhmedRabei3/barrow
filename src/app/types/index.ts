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
    status?: string | null;
    moderationAction?: string | null;
    moderationNote?: string | null;
    moderatedAt?: string | null;
    // Property-specific
    bedrooms?: number | null;
    bathrooms?: number | null;
    guests?: number | null;
    livingrooms?: number | null;
    kitchens?: number | null;
    area?: number | null;
    floor?: number | null;
    furnished?: boolean | null;
    petAllowed?: boolean | null;
    elvator?: boolean | null;
    // Car-specific
    color?: string | null;
    fuelType?: string | null;
    gearType?: string | null;
    mileage?: number | null;
    repainted?: boolean | null;
    reAssembled?: boolean | null;
    furnitureCondition?: string | null;
    furnitureMaterial?: string | null;
    furnitureRoomType?: string | null;
    furnitureDimensions?: string | null;
    furnitureAssemblyIncluded?: boolean | null;
    medicalCondition?: string | null;
    medicalManufacturerCountry?: string | null;
    medicalWarrantyMonths?: number | null;
    medicalUsageHours?: number | null;
    medicalRequiresPrescription?: boolean | null;
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
