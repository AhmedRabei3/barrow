import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminCapability } from "@/app/api/utils/adminCapabilities";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import { Errors } from "@/app/api/lib/errors/errors";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { getItem } from "@/app/api/items/functions/helpers";

/**
 * @description راوت جلب تفاصيل الطلب عبر معرفه
 * @route ~/api/admin/purchase-req/details/[requestId]
 * @access private (Admin only)
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const admin = await requireAdminUser();
    assertAdminCapability(admin, "USER_MANAGEMENT", "Access denied");
    const { requestId } = await params;

    const purchaseReq = await prisma.purchaseRequest.findUnique({
      where: {
        id: requestId,
        assignedAdminId: admin.id,
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    if (!purchaseReq) throw Errors.NOT_FOUND();
    const item = await getItem(purchaseReq.itemType, purchaseReq.itemId);

    if (!item)
      throw Errors.NOT_FOUND("طلب الشراء غير موجود أو لا تملك صلاحية الوصول");

    return NextResponse.json({ data: { item, purchaseReq } });
  } catch (error) {
    return handleApiError(error, req);
  }
}
