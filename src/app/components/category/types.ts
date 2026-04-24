export type ItemType =
  | "NEW_CAR"
  | "USED_CAR"
  | "PROPERTY"
  | "HOME_FURNITURE"
  | "MEDICAL_DEVICE"
  | "OTHER";

export interface CategoryItem {
  id: string;
  name: string;
  nameAr?: string | null;
  nameEn?: string | null;
  icon: string | null;
  type: ItemType;
  isDeleted: boolean;
}
