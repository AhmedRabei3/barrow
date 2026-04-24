import { CarModalData } from "@/app/hooks/useAddCarModal";
import { UsedCarModalData } from "@/app/hooks/useUsedCarModal";
import { $Enums } from "@prisma/client";

type SmartAssistantEditData = Record<string, unknown>;

const toNumberOrUndefined = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

type EditableItem = {
  category?: { type?: $Enums.ItemType | string | null };
  item?: {
    id?: string;
    title?: string | null;
    name?: string | null;
    brand?: string | null;
    model?: string | null;
    year?: number | null;
    color?: string | null;
    price?: number | null;
    description?: string | null;
    categoryId?: string | null;
    gearType?: string | null;
    fuelType?: string | null;
    sellOrRent?: string | null;
    rentType?: string | null;
    status?: string | null;
    reAssembled?: boolean | null;
    repainted?: boolean | null;
    mileage?: number | null;
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
    guests?: number | null;
    livingrooms?: number | null;
    bathrooms?: number | null;
    bedrooms?: number | null;
    kitchens?: number | null;
    area?: number | null;
    floor?: number | null;
    direction?: string[] | null;
    petAllowed?: boolean | null;
    furnished?: boolean | null;
    elvator?: boolean | null;
  };
  itemLocation?: Array<{
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  }>;
};

export function buildEditDataByType(itemToEdit: EditableItem) {
  const itemType = itemToEdit?.category?.type as $Enums.ItemType | undefined;
  let editData: CarModalData | UsedCarModalData | SmartAssistantEditData;

  const baseLocationData = {
    latitude: toNumberOrUndefined(itemToEdit.itemLocation?.[0]?.latitude),
    longitude: toNumberOrUndefined(itemToEdit.itemLocation?.[0]?.longitude),
    address: itemToEdit.itemLocation?.[0]?.address ?? undefined,
    city: itemToEdit.itemLocation?.[0]?.city ?? undefined,
    state: itemToEdit.itemLocation?.[0]?.state ?? undefined,
    country: itemToEdit.itemLocation?.[0]?.country ?? undefined,
  };

  if (itemType === $Enums.ItemType.NEW_CAR) {
    editData = {
      id: itemToEdit.item?.id,
      brand: itemToEdit.item?.brand ?? undefined,
      model: itemToEdit.item?.model ?? undefined,
      year: toNumberOrUndefined(itemToEdit.item?.year),
      color: itemToEdit.item?.color ?? undefined,
      price: toNumberOrUndefined(itemToEdit.item?.price),
      description: itemToEdit.item?.description ?? undefined,
      categoryId: itemToEdit.item?.categoryId ?? undefined,
      gearType: itemToEdit.item?.gearType ?? undefined,
      fuelType: itemToEdit.item?.fuelType ?? undefined,
      sellOrRent: itemToEdit.item?.sellOrRent ?? undefined,
      rentType: itemToEdit.item?.rentType ?? undefined,
      status: itemToEdit.item?.status ?? undefined,
      ...baseLocationData,
    };
  } else if (itemType === $Enums.ItemType.USED_CAR) {
    editData = {
      id: itemToEdit.item?.id,
      brand: itemToEdit.item?.brand ?? undefined,
      model: itemToEdit.item?.model ?? undefined,
      year: toNumberOrUndefined(itemToEdit.item?.year),
      color: itemToEdit.item?.color ?? undefined,
      price: toNumberOrUndefined(itemToEdit.item?.price),
      description: itemToEdit.item?.description ?? undefined,
      categoryId: itemToEdit.item?.categoryId ?? undefined,
      gearType: itemToEdit.item?.gearType ?? undefined,
      fuelType: itemToEdit.item?.fuelType ?? undefined,
      sellOrRent: itemToEdit.item?.sellOrRent ?? undefined,
      rentType: itemToEdit.item?.rentType ?? undefined,
      status: itemToEdit.item?.status ?? undefined,
      reAssembled: itemToEdit.item?.reAssembled ?? undefined,
      repainted: itemToEdit.item?.repainted ?? undefined,
      mileage: toNumberOrUndefined(itemToEdit.item?.mileage),
      ...baseLocationData,
    };
  } else if (itemType === $Enums.ItemType.PROPERTY) {
    editData = {
      id: itemToEdit.item?.id,
      title: itemToEdit.item?.title ?? undefined,
      categoryId: itemToEdit.item?.categoryId ?? undefined,
      price: toNumberOrUndefined(itemToEdit.item?.price),
      guests: toNumberOrUndefined(itemToEdit.item?.guests),
      livingrooms: toNumberOrUndefined(itemToEdit.item?.livingrooms),
      bathrooms: toNumberOrUndefined(itemToEdit.item?.bathrooms),
      bedrooms: toNumberOrUndefined(itemToEdit.item?.bedrooms),
      kitchens: toNumberOrUndefined(itemToEdit.item?.kitchens),
      area: toNumberOrUndefined(itemToEdit.item?.area),
      floor: toNumberOrUndefined(itemToEdit.item?.floor),
      direction: Array.isArray(itemToEdit.item?.direction)
        ? itemToEdit.item?.direction
        : undefined,
      petAllowed: itemToEdit.item?.petAllowed ?? undefined,
      furnished: itemToEdit.item?.furnished ?? undefined,
      elvator: itemToEdit.item?.elvator ?? undefined,
      sellOrRent: itemToEdit.item?.sellOrRent ?? undefined,
      rentType: itemToEdit.item?.rentType ?? undefined,
      status: itemToEdit.item?.status ?? undefined,
      description: itemToEdit.item?.description ?? undefined,
      ...baseLocationData,
    };
  } else if (itemType === $Enums.ItemType.OTHER) {
    editData = {
      id: itemToEdit.item?.id,
      name: itemToEdit.item?.name ?? undefined,
      brand: itemToEdit.item?.brand ?? undefined,
      categoryId: itemToEdit.item?.categoryId ?? undefined,
      price: toNumberOrUndefined(itemToEdit.item?.price),
      sellOrRent: itemToEdit.item?.sellOrRent ?? undefined,
      rentType: itemToEdit.item?.rentType ?? undefined,
      status: itemToEdit.item?.status ?? undefined,
      furnitureCondition: itemToEdit.item?.furnitureCondition ?? undefined,
      furnitureMaterial: itemToEdit.item?.furnitureMaterial ?? undefined,
      furnitureRoomType: itemToEdit.item?.furnitureRoomType ?? undefined,
      furnitureDimensions: itemToEdit.item?.furnitureDimensions ?? undefined,
      furnitureAssemblyIncluded:
        itemToEdit.item?.furnitureAssemblyIncluded ?? undefined,
      medicalCondition: itemToEdit.item?.medicalCondition ?? undefined,
      medicalManufacturerCountry:
        itemToEdit.item?.medicalManufacturerCountry ?? undefined,
      medicalWarrantyMonths: toNumberOrUndefined(
        itemToEdit.item?.medicalWarrantyMonths,
      ),
      medicalUsageHours: toNumberOrUndefined(
        itemToEdit.item?.medicalUsageHours,
      ),
      medicalRequiresPrescription:
        itemToEdit.item?.medicalRequiresPrescription ?? undefined,
      description: itemToEdit.item?.description ?? undefined,
      ...baseLocationData,
    };
  } else {
    throw new Error("نوع العنصر غير مدعوم للتعديل حالياً");
  }
  return {
    data: editData,
    itemType,
  };
}
