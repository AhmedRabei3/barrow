import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { CloudinaryUploadResult, deleteFromCloudinary } from "./cloudinary";
import { upsertListingIndex } from "@/server/services/listing-index.service";
import { notifyNearbyUsersAsync } from "@/server/services/nearby-notify.service";
import { notifyListingAlertSubscribersAsync } from "@/server/services/listing-alerts-notify.service";

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
  /** Owner user ID — when provided, nearby users will be notified. */
  ownerId?: string;
  /** Display title for the nearby notification. */
  itemTitle?: string;
  /** Language resolved from the request session cookie — passed to nearby notifications. */
  isArabic?: boolean;
};

export async function createItemWithLocation<T extends { id: string }>({
  location,
  images,
  itemType,
  createItem,
  ownerId,
  itemTitle,
  isArabic,
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

    const itemWithMeta = item as T & {
      categoryId?: string | null;
      sellOrRent?: TransactionType | null;
    };

    // Notify nearby users if owner and title are provided
    if (ownerId && itemTitle) {
      notifyNearbyUsersAsync({
        ownerId,
        lat: location.latitude,
        lng: location.longitude,
        itemType,
        title: itemTitle,
        isArabic,
      });

      notifyListingAlertSubscribersAsync({
        ownerId,
        itemId: item.id,
        lat: location.latitude,
        lng: location.longitude,
        itemType,
        title: itemTitle,
        categoryId: itemWithMeta.categoryId ?? null,
        sellOrRent: itemWithMeta.sellOrRent ?? null,
        isArabic,
      });
    }
    return item;
  } catch (error) {
    console.error("Transaction failed:", error);
    if (images.length > 0) {
      await deleteFromCloudinary(images);
    }
    throw error;
  }
}
