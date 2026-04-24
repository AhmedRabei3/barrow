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

    if (!item) {
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
