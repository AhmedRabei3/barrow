import { prisma } from "@/lib/prisma";
import { ItemType } from "@prisma/client";

type LocationInput = {
  latitude: number;
  longitude: number;
  city: string;
  address: string;
  state?: string;
  country?: string;
};

export async function saveLocation(
  itemId: string,
  itemType: ItemType,
  loc: LocationInput,
) {
  const relationField =
    itemType === "NEW_CAR"
      ? { newCarId: itemId }
      : itemType === "USED_CAR"
        ? { oldCarId: itemId }
        : itemType === "PROPERTY"
          ? { propertyId: itemId }
          : { otherItemId: itemId };

  return prisma.location.create({
    data: {
      latitude: loc.latitude,
      longitude: loc.longitude,
      city: loc.city,
      address: loc.address,
      state: loc.state ?? "",
      country: loc.country ?? "",
      ...relationField,
    },
  });
}
