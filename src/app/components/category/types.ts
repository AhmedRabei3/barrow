export type ItemType = "NEW_CAR" | "USED_CAR" | "PROPERTY" | "OTHER";

export interface CategoryItem {
  id: string;
  name: string;
  icon: string | null;
  type: ItemType;
  isDeleted: boolean;
}
