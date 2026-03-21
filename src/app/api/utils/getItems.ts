import { prisma } from "@/lib/prisma";
import { ItemType, Prisma } from "@prisma/client";

export interface ItemFilter {
  categoryId?: string;
  itemType?: ItemType;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "price" | "averageRating" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface ItemWithRelations {
  id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  year: number | null;
  color: string | null;
  mileage: number | null;
  rentType: string | null;
  fuelType: string | null;
  gearType: string | null;
  status: string | null;
  itemType: ItemType;
  itemImages: { publicId: string | null; url: string }[];
  itemLocation: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    country: string;
  }[];
  itemReviews: {
    id: string;
    userId: string;
    rate: number;
    comment: string | null;
    createdAt: Date;
    updatedAt?: Date;
  }[];
  averageRating: number;
  totalReviews: number;
  category: { id: string; name: string; type: ItemType } | null;
  owner: {
    id: string;
    name: string;
    profileImage?: string | null;
    averageUserRating?: number | null;
  };
}

type BaseItem = Partial<{
  id: string;
  title: string;
  description: string | null;
  price: number | { toString(): string };
  year: number;
  color: string;
  mileage: number;
  rentType: string | null;
  fuelType: string;
  gearType: string;
  status: string;
  createdAt: Date;
  itemType: ItemType;
  category: { id: string; name: string; type: ItemType };
  owner: {
    id: string;
    name: string;
    profileImage?: string | null;
    averageUserRating?: number | null;
  };
}>;

export const itemSearch = async (
  filter: ItemFilter = {},
): Promise<ItemWithRelations[]> => {
  const {
    categoryId,
    minPrice,
    maxPrice,
    city,
    search,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filter;

  const buildWhere = (modelType: ItemType) => {
    const baseWhere:
      | Prisma.PropertyWhereInput
      | Prisma.OldCarWhereInput
      | Prisma.NewCarWhereInput
      | Prisma.OtherItemWhereInput = {
      isDeleted: false,
    };
    if (categoryId) baseWhere.categoryId = categoryId;
    if (
      modelType === ItemType.PROPERTY ||
      modelType === ItemType.NEW_CAR ||
      modelType === ItemType.USED_CAR ||
      modelType === ItemType.OTHER
    ) {
      const priceFilter: { gte?: number; lte?: number } = {};
      if (minPrice != null) priceFilter.gte = minPrice;
      if (maxPrice != null) priceFilter.lte = maxPrice;
      if (Object.keys(priceFilter).length > 0) {
        baseWhere.price = priceFilter;
      }
    }
    if (search) {
      baseWhere.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    return baseWhere;
  };

  // استعلامات متوازية لكل موديل
  const [properties, oldCars, newCars, otherItems] = await Promise.all([
    prisma.property.findMany({
      where: buildWhere(ItemType.PROPERTY) as Prisma.PropertyWhereInput,
      include: { category: true, owner: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy === "averageRating" ? "averageRating" : sortBy]: sortOrder,
      },
    }),
    prisma.oldCar.findMany({
      where: buildWhere(ItemType.USED_CAR) as Prisma.OldCarWhereInput,
      include: { category: true, owner: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy === "averageRating" ? "averageRating" : sortBy]: sortOrder,
      },
    }),
    prisma.newCar.findMany({
      where: buildWhere(ItemType.NEW_CAR) as Prisma.NewCarWhereInput,
      include: { category: true, owner: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy === "averageRating" ? "averageRating" : sortBy]: sortOrder,
      },
    }),
    prisma.otherItem.findMany({
      where: buildWhere(ItemType.OTHER) as Prisma.OtherItemWhereInput,
      include: { category: true, owner: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy === "averageRating" ? "averageRating" : sortBy]: sortOrder,
      },
    }),
  ]);

  const allItemsRaw: BaseItem[] = [
    ...properties.map((i) => ({ ...i, itemType: ItemType.PROPERTY })),
    ...oldCars.map((i) => ({ ...i, itemType: ItemType.USED_CAR })),
    ...newCars.map((i) => ({ ...i, itemType: ItemType.NEW_CAR })),
    ...otherItems.map((i) => ({ ...i, itemType: ItemType.OTHER })),
  ];

  const allItems = await Promise.all(
    allItemsRaw.map(async (item) => {
      if (!item.id) return null;

      const [itemImages, itemLocation, itemReviews] = await Promise.all([
        prisma.itemImage.findMany({
          where: { itemId: item.id },
          select: { publicId: true, url: true },
        }),
        prisma.location.findMany({
          where:
            item.itemType === ItemType.NEW_CAR
              ? { newCarId: item.id }
              : item.itemType === ItemType.USED_CAR
                ? { oldCarId: item.id }
                : item.itemType === ItemType.PROPERTY
                  ? { propertyId: item.id }
                  : { otherItemId: item.id },
          select: {
            latitude: true,
            longitude: true,
            address: true,
            city: true,
            country: true,
          },
        }),
        prisma.review.findMany({
          where: { itemId: item.id },
          select: {
            id: true,
            userId: true,
            rate: true,
            comment: true,
            createdAt: true,
          },
        }),
      ]);

      const totalReviews = itemReviews.length;
      const averageRating =
        totalReviews > 0
          ? itemReviews.reduce((sum, r) => sum + r.rate, 0) / totalReviews
          : 0;

      const filteredLocations = city
        ? itemLocation.filter(
            (loc) => loc.city.toLowerCase() === city.toLowerCase(),
          )
        : itemLocation;

      return {
        id: item.id,
        title: item.title ?? null,
        description: item.description ?? null,
        price: item.price != null ? Number(item.price) : null,
        year: item.year ?? null,
        color: item.color ?? null,
        mileage: item.mileage ?? null,
        rentType: item.rentType ?? null,
        fuelType: item.fuelType ?? null,
        gearType: item.gearType ?? null,
        status: item.status ?? null,
        itemType: item.itemType ?? ItemType.OTHER,
        itemImages,
        itemLocation: filteredLocations,
        itemReviews,
        averageRating: Number(averageRating.toFixed(2)),
        totalReviews,
        category: item.category
          ? {
              id: item.category.id,
              name: item.category.name,
              type: item.category.type,
            }
          : null,
        owner: {
          id: item.owner?.id ?? "",
          name: item.owner?.name ?? "Unknown",
          profileImage: item.owner?.profileImage ?? null,
          averageUserRating: item.owner?.averageUserRating ?? null,
        },
      };
    }),
  );

  return allItems.filter((item) => item !== null) as ItemWithRelations[];
};
