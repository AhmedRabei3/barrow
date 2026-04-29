import { prisma } from "@/lib/prisma";
import { CloudinaryUploadResult, deleteFromCloudinary } from "./cloudinary";
import { upsertListingIndex } from "@/server/services/listing-index.service";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type LocationInput = {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  state?: string | undefined;
};

type CreateItemWithLocationParams<T> = {
  location: LocationInput;
  images: CloudinaryUploadResult[];
  itemType:
    | "USED_CAR"
    | "NEW_CAR"
    | "PROPERTY"
    | "HOME_FURNITURE"
    | "MEDICAL_DEVICE"
    | "OTHER";
  createItem: (tx: TxClient) => Promise<T>;
};

export async function createItemWithLocation<T extends { id: string }>({
  location,
  images,
  itemType,
  createItem,
}: CreateItemWithLocationParams<T>) {
  try {
    const item = await prisma.$transaction(async (tx: TxClient) => {
      const createdItem = await createItem(tx);
      await tx.location.create({
        data: {
          latitude: location.latitude,
          longitude: location.longitude,
          city: location.city,
          address: location.address,
          state: location.state || "",
          country: location.country,
          ...(itemType === "OTHER" && { otherItemId: createdItem.id }),
          ...(itemType === "PROPERTY" && { propertyId: createdItem.id }),
          ...(itemType === "NEW_CAR" && { newCarId: createdItem.id }),
          ...(itemType === "USED_CAR" && { oldCarId: createdItem.id }),
          ...(itemType === "HOME_FURNITURE" && {
            homeFurnitureId: createdItem.id,
          }),
          ...(itemType === "MEDICAL_DEVICE" && {
            medicalDeviceId: createdItem.id,
          }),
        },
      });
      if (images.length > 0) {
        await tx.itemImage.createMany({
          data: images.map((img) => ({
            itemId: createdItem.id,
            itemType,
            url: img.secure_url,
            publicId: img.public_id ?? "",
          })),
        });
      }
      return createdItem;
    });
    void upsertListingIndex(
      item.id,
      itemType as import("@prisma/client").$Enums.ItemType,
    );
    return item;
  } catch (error) {
    console.error("Transaction failed:", error);
    if (images.length > 0) {
      await deleteFromCloudinary(images);
    }
    throw error;
  }
}
