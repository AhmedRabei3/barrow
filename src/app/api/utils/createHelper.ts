import { prisma } from "@/lib/prisma";
import { CloudinaryUploadResult, deleteFromCloudinary } from "./cloudinary";

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
    return await prisma.$transaction(async (tx: TxClient) => {
      // 1️⃣ Create Item (بدون Location)
      const item = await createItem(tx);

      // 2️⃣ Create Location وربطه بالـ Item
      await tx.location.create({
        data: {
          latitude: location.latitude,
          longitude: location.longitude,
          city: location.city,
          address: location.address,
          state: location.state || "",
          country: location.country,

          // الربط الصحيح حسب نوع العنصر
          ...(itemType === "OTHER" && { otherItemId: item.id }),
          ...(itemType === "PROPERTY" && { propertyId: item.id }),
          ...(itemType === "NEW_CAR" && { newCarId: item.id }),
          ...(itemType === "USED_CAR" && { oldCarId: item.id }),
          ...(itemType === "HOME_FURNITURE" && { homeFurnitureId: item.id }),
          ...(itemType === "MEDICAL_DEVICE" && { medicalDeviceId: item.id }),
        },
      });

      // 3️⃣ Save Images
      if (images.length > 0) {
        await tx.itemImage.createMany({
          data: images.map((img) => ({
            itemId: item.id,
            itemType,
            url: img.secure_url,
            publicId: img.public_id ?? "",
          })),
        });
      }

      return item;
    });
  } catch (error) {
    console.error("❌ Transaction failed:", error);

    // 🔥 Rollback Cloudinary
    if (images.length > 0) {
      await deleteFromCloudinary(images);
    }

    throw error;
  }
}
