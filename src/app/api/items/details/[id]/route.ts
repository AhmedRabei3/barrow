import { NextResponse } from "next/server";
import {
  attachRelatedById,
  findItemByType,
  getItemTypeById,
} from "../../functions/helpers";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { Errors } from "@/app/api/lib/errors/errors";
import { prisma } from "@/lib/prisma";

/**
 * @description جلب العنصر مع الصور والموقع والمراجعات
 * @route GET /api/items/details/[id]
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    /**
     * 1️⃣ جلب Location ومعرفة نوع العنصر
     */
    const { itemType } = await getItemTypeById(id);

    /**
     * جلب العنصر والموقع
     */
    const location = await prisma.location.findFirst({
      where: {
        OR: [
          { newCarId: id, isDeleted: false },
          { oldCarId: id, isDeleted: false },
          { propertyId: id, isDeleted: false },
          { homeFurnitureId: id, isDeleted: false },
          { medicalDeviceId: id, isDeleted: false },
          { otherItemId: id, isDeleted: false },
        ],
      },
    });

    const itemData = await findItemByType(itemType, id);

    if (!itemData || !location) {
      throw Errors.NOT_FOUND();
    }

    /**
     * 3️⃣ جلب البيانات المرتبطة
     */
    const { images, reviews, transactions } = await attachRelatedById(id);

    const locationData = {
      latitude: location?.latitude,
      longitude: location?.longitude,
      address: location?.address,
      state: location?.state,
      city: location?.city,
      country: location?.country,
    };

    /**
     * 4️⃣ Response
     */
    return NextResponse.json(
      {
        success: true,
        item: {
          type: itemType,
          data: itemData,
          location: locationData,
          images,
          reviews,
          transactions,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Error fetching item details:", error);
    return handleApiError(error, req);
  }
}
