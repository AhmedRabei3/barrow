import { NextResponse } from "next/server";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { Errors } from "@/app/api/lib/errors/errors";
import { getListingDetailsById } from "@/server/services/listing-details.service";

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
    const item = await getListingDetailsById(id);

    // جلب النوع والموقع والبيانات إذا كان العنصر موجودًا
    if (!item) {
      throw Errors.NOT_FOUND();
    }

    // إذا كنت بحاجة لجلب بيانات إضافية مثل النوع والموقع، أضفها هنا
    // const { itemType } = await getItemTypeById(id);
    // const location = await prisma.location.findFirst({ ... });
    // const itemData = await findItemByType(itemType, id);
    // if (!itemData || !location) {
    //   throw Errors.NOT_FOUND();
    // }
      throw Errors.NOT_FOUND();
    }

    /**
     * 4️⃣ Response
     */
    return NextResponse.json(
      {
        success: true,
        item,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Error fetching item details:", error);
    return handleApiError(error, req);
  }
}
