import { $Enums } from "@prisma/client";

/* ========== FORM TYPES ========== */

export interface NewCarFormData {
  itemType: typeof $Enums.ItemType.NEW_CAR;
  categoryId: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  price: number;
  description: string;
  sellOrRent: $Enums.TransactionType;
  rentType?: $Enums.RentType;
  fuelType: string;
  gearType: string;
  latitude: number;
  longitude: number;
}

export interface UsedCarFormData extends Omit<NewCarFormData, "itemType"> {
  itemType: typeof $Enums.ItemType.USED_CAR;
  mileage: number;
  repainted: boolean;
  reAssembled: boolean;
}

export interface RealEstateFormData {
  itemType: typeof $Enums.ItemType.PROPERTY;
  categoryId: string;
  propertyType: string;
  area: number;
  bedrooms: number;
  livingrooms: number;
  kitchens: number;
  floor: number;
  bathrooms: number;
  price: number;
  description: string;
  latitude: number;
  longitude: number;
}

export interface OtherItemFormData {
  itemType: typeof $Enums.ItemType.OTHER;
  categoryId: string;
  name: string;
  brand: string;
  price: number;
  description: string;
  latitude: number;
  longitude: number;
}

export type AddFormData =
  | NewCarFormData
  | UsedCarFormData
  | RealEstateFormData
  | OtherItemFormData;

export type FormDataByItemType = {
  NEW_CAR: NewCarFormData;
  USED_CAR: UsedCarFormData;
  PROPERTY: RealEstateFormData;
  OTHER: OtherItemFormData;
};
