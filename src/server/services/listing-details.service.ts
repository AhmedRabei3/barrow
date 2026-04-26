import { $Enums, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildListingDetailsPath, resolveListingTitle } from "@/lib/listingSeo";

const locationSelect = {
  latitude: true,
  longitude: true,
  address: true,
  state: true,
  city: true,
  country: true,
} satisfies Prisma.LocationSelect;

const categorySelect = {
  id: true,
  name: true,
  nameAr: true,
  nameEn: true,
  type: true,
} satisfies Prisma.CategorySelect;

const ownerSelect = {
  id: true,
  name: true,
} satisfies Prisma.UserSelect;

const propertySelect = {
  id: true,
  title: true,
  description: true,
  price: true,
  status: true,
  sellOrRent: true,
  rentType: true,
  ownerId: true,
  guests: true,
  bedrooms: true,
  bathrooms: true,
  livingrooms: true,
  kitchens: true,
  area: true,
  floor: true,
  furnished: true,
  petAllowed: true,
  elvator: true,
  direction: true,
  category: { select: categorySelect },
  owner: { select: ownerSelect },
  location: { select: locationSelect },
} satisfies Prisma.PropertySelect;

const newCarSelect = {
  id: true,
  brand: true,
  model: true,
  year: true,
  price: true,
  status: true,
  sellOrRent: true,
  rentType: true,
  ownerId: true,
  color: true,
  fuelType: true,
  gearType: true,
  description: true,
  category: { select: categorySelect },
  owner: { select: ownerSelect },
  location: { select: locationSelect },
} satisfies Prisma.NewCarSelect;

const oldCarSelect = {
  id: true,
  brand: true,
  model: true,
  year: true,
  price: true,
  status: true,
  sellOrRent: true,
  rentType: true,
  ownerId: true,
  color: true,
  fuelType: true,
  gearType: true,
  description: true,
  mileage: true,
  repainted: true,
  reAssembled: true,
  category: { select: categorySelect },
  owner: { select: ownerSelect },
  location: { select: locationSelect },
} satisfies Prisma.OldCarSelect;

const homeFurnitureSelect = {
  id: true,
  name: true,
  brand: true,
  description: true,
  price: true,
  status: true,
  sellOrRent: true,
  rentType: true,
  ownerId: true,
  condition: true,
  material: true,
  roomType: true,
  dimensions: true,
  assemblyIncluded: true,
  color: true,
  category: { select: categorySelect },
  owner: { select: ownerSelect },
  location: { select: locationSelect },
} satisfies Prisma.HomeFurnitureSelect;

const medicalDeviceSelect = {
  id: true,
  name: true,
  manufacturer: true,
  model: true,
  description: true,
  price: true,
  status: true,
  sellOrRent: true,
  rentType: true,
  ownerId: true,
  deviceFunction: true,
  manufactureYear: true,
  condition: true,
  dimensions: true,
  weight: true,
  manufacturerPlace: true,
  isUsed: true,
  warrantyMonths: true,
  usageHours: true,
  category: { select: categorySelect },
  owner: { select: ownerSelect },
  location: { select: locationSelect },
} satisfies Prisma.MedicalDeviceSelect;

const otherItemSelect = {
  id: true,
  name: true,
  brand: true,
  description: true,
  price: true,
  status: true,
  sellOrRent: true,
  rentType: true,
  ownerId: true,
  furnitureCondition: true,
  furnitureMaterial: true,
  furnitureRoomType: true,
  furnitureDimensions: true,
  furnitureAssemblyIncluded: true,
  medicalCondition: true,
  medicalManufacturerCountry: true,
  medicalWarrantyMonths: true,
  medicalUsageHours: true,
  medicalRequiresPrescription: true,
  category: { select: categorySelect },
  owner: { select: ownerSelect },
  location: { select: locationSelect },
} satisfies Prisma.OtherItemSelect;

type PropertyListing = Prisma.PropertyGetPayload<{
  select: typeof propertySelect;
}>;
type NewCarListing = Prisma.NewCarGetPayload<{ select: typeof newCarSelect }>;
type OldCarListing = Prisma.OldCarGetPayload<{ select: typeof oldCarSelect }>;
type HomeFurnitureListing = Prisma.HomeFurnitureGetPayload<{
  select: typeof homeFurnitureSelect;
}>;
type MedicalDeviceListing = Prisma.MedicalDeviceGetPayload<{
  select: typeof medicalDeviceSelect;
}>;
type OtherItemListing = Prisma.OtherItemGetPayload<{
  select: typeof otherItemSelect;
}>;

type RawListingItem =
  | PropertyListing
  | NewCarListing
  | OldCarListing
  | HomeFurnitureListing
  | MedicalDeviceListing
  | OtherItemListing
  | null;

type ListingReview = {
  id: string;
  userId: string;
  rate: number;
  comment: string | null;
};

type ListingTransaction = Awaited<
  ReturnType<typeof prisma.transaction.findMany>
>[number];

export type ListingDetailsDto = {
  type: $Enums.ItemType;
  data: Record<string, unknown> & {
    id: string;
    title?: string;
    name?: string;
    brand?: string | null;
    model?: string | null;
    price?: number;
    description?: string | null;
    ownerId?: string | null;
    status?: string;
    sellOrRent?: string;
    rentType?: string | null;
  };
  category: {
    id: string;
    name: string;
    nameAr: string | null;
    nameEn: string | null;
    type: $Enums.ItemType;
  } | null;
  owner: {
    id: string;
    name: string;
  } | null;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    state: string;
    city: string;
    country: string;
  } | null;
  images: Array<{ url: string }>;
  reviews: ListingReview[];
  transactions: ListingTransaction[];
  averageRating: number | null;
  reviewsCount: number;
  canonicalPath: string;
  title: string;
};

type NormalizedListingData = ListingDetailsDto["data"] & {
  category?: ListingDetailsDto["category"];
  owner?: ListingDetailsDto["owner"];
  location?: ListingDetailsDto["location"];
};

const availabilityWhere = {
  isDeleted: false,
  status: $Enums.Availability.AVAILABLE,
};

const resolveItemTypeByLocation = async (id: string) => {
  const location = await prisma.location.findFirst({
    where: {
      isDeleted: false,
      OR: [
        { newCarId: id },
        { oldCarId: id },
        { propertyId: id },
        { homeFurnitureId: id },
        { medicalDeviceId: id },
        { otherItemId: id },
      ],
    },
    select: {
      newCarId: true,
      oldCarId: true,
      propertyId: true,
      homeFurnitureId: true,
      medicalDeviceId: true,
      otherItemId: true,
    },
  });

  if (!location) {
    return null;
  }

  if (location.newCarId) return $Enums.ItemType.NEW_CAR;
  if (location.oldCarId) return $Enums.ItemType.USED_CAR;
  if (location.propertyId) return $Enums.ItemType.PROPERTY;
  if (location.homeFurnitureId) return $Enums.ItemType.HOME_FURNITURE;
  if (location.medicalDeviceId) return $Enums.ItemType.MEDICAL_DEVICE;
  if (location.otherItemId) return $Enums.ItemType.OTHER;
  return null;
};

const loadRawItem = async (type: $Enums.ItemType, id: string) => {
  switch (type) {
    case $Enums.ItemType.PROPERTY:
      return prisma.property.findFirst({
        where: { id, ...availabilityWhere },
        select: propertySelect,
      });
    case $Enums.ItemType.NEW_CAR:
      return prisma.newCar.findFirst({
        where: { id, ...availabilityWhere },
        select: newCarSelect,
      });
    case $Enums.ItemType.USED_CAR:
      return prisma.oldCar.findFirst({
        where: { id, ...availabilityWhere },
        select: oldCarSelect,
      });
    case $Enums.ItemType.HOME_FURNITURE:
      return prisma.homeFurniture.findFirst({
        where: { id, ...availabilityWhere },
        select: homeFurnitureSelect,
      });
    case $Enums.ItemType.MEDICAL_DEVICE:
      return prisma.medicalDevice.findFirst({
        where: { id, ...availabilityWhere },
        select: medicalDeviceSelect,
      });
    case $Enums.ItemType.OTHER:
      return prisma.otherItem.findFirst({
        where: { id, ...availabilityWhere },
        select: otherItemSelect,
      });
  }
};

const normalizeListingData = (type: $Enums.ItemType, item: RawListingItem) => {
  if (!item) {
    return null;
  }

  switch (type) {
    case $Enums.ItemType.HOME_FURNITURE: {
      const homeFurnitureItem = item as HomeFurnitureListing;

      return {
        ...homeFurnitureItem,
        furnitureCondition: homeFurnitureItem.condition,
        furnitureMaterial: homeFurnitureItem.material,
        furnitureRoomType: homeFurnitureItem.roomType,
        furnitureDimensions: homeFurnitureItem.dimensions,
        furnitureAssemblyIncluded: homeFurnitureItem.assemblyIncluded,
        price: Number(homeFurnitureItem.price),
      };
    }
    case $Enums.ItemType.MEDICAL_DEVICE: {
      const medicalDeviceItem = item as MedicalDeviceListing;

      return {
        ...medicalDeviceItem,
        brand: medicalDeviceItem.manufacturer,
        medicalCondition: medicalDeviceItem.condition,
        medicalDeviceFunction: medicalDeviceItem.deviceFunction,
        medicalManufactureYear: medicalDeviceItem.manufactureYear,
        medicalDimensions: medicalDeviceItem.dimensions,
        medicalWeight: medicalDeviceItem.weight,
        medicalManufacturerPlace: medicalDeviceItem.manufacturerPlace,
        medicalIsUsed: medicalDeviceItem.isUsed,
        medicalWarrantyMonths: medicalDeviceItem.warrantyMonths,
        medicalUsageHours: medicalDeviceItem.usageHours,
        price: Number(medicalDeviceItem.price),
      };
    }
    default:
      return {
        ...item,
        price: "price" in item ? Number(item.price) : undefined,
      };
  }
};

export async function getListingDetailsById(
  id: string,
): Promise<ListingDetailsDto | null> {
  const itemType = await resolveItemTypeByLocation(id);
  if (!itemType) {
    return null;
  }

  const [rawItem, images, reviews, transactions] = await Promise.all([
    loadRawItem(itemType, id),
    prisma.itemImage.findMany({
      where: { itemId: id },
      orderBy: { createdAt: "asc" },
      select: { url: true },
    }),
    prisma.review.findMany({
      where: { itemId: id },
      select: { id: true, userId: true, rate: true, comment: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { itemId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const data = normalizeListingData(itemType, rawItem);
  if (!data) {
    return null;
  }

  const normalizedData = data as NormalizedListingData;

  const ratingValues = reviews.map((review) => review.rate);
  const averageRating =
    ratingValues.length > 0
      ? Number(
          (
            ratingValues.reduce((sum, value) => sum + value, 0) /
            ratingValues.length
          ).toFixed(2),
        )
      : null;

  const title = resolveListingTitle({
    title:
      typeof normalizedData.title === "string"
        ? normalizedData.title
        : undefined,
    name:
      typeof normalizedData.name === "string" ? normalizedData.name : undefined,
    brand:
      typeof normalizedData.brand === "string"
        ? normalizedData.brand
        : undefined,
    model:
      typeof normalizedData.model === "string"
        ? normalizedData.model
        : undefined,
  });

  const location = normalizedData.location
    ? {
        latitude: normalizedData.location.latitude,
        longitude: normalizedData.location.longitude,
        address: normalizedData.location.address,
        state: normalizedData.location.state,
        city: normalizedData.location.city,
        country: normalizedData.location.country,
      }
    : null;

  return {
    type: itemType,
    data: normalizedData,
    category: normalizedData.category ?? null,
    owner: normalizedData.owner ?? null,
    location,
    images,
    reviews,
    transactions,
    averageRating,
    reviewsCount: reviews.length,
    canonicalPath: buildListingDetailsPath({
      id,
      title:
        typeof normalizedData.title === "string"
          ? normalizedData.title
          : undefined,
      name:
        typeof normalizedData.name === "string"
          ? normalizedData.name
          : undefined,
      brand:
        typeof normalizedData.brand === "string"
          ? normalizedData.brand
          : undefined,
      model:
        typeof normalizedData.model === "string"
          ? normalizedData.model
          : undefined,
      city: location?.city,
      country: location?.country,
    }),
    title,
  };
}
