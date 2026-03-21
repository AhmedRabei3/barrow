import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { Errors } from "@/app/api/lib/errors/errors";
import { authHelper } from "@/app/api/utils/authHelper";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * @description مسار جلب طلبات الشراء التي يقوم الأدمن بالإشراف عليها
 * @route ~/api/admin/purchase-req/my-req
 * @method GET
 * @access private (فقط الأدمن المسؤول عن الطلب)
 */

export async function GET(req: NextRequest) {
  const admin = await authHelper();
  try {
    if (!admin.isAdmin) throw Errors.UNAUTHORIZED();

    const purchaseReq = await prisma.purchaseRequest.findMany({
      where: { assignedAdminId: admin.id },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    if (!purchaseReq) throw Errors.NOT_FOUND("ليس لديك طلبات");
    return NextResponse.json(purchaseReq);
  } catch (error) {
    console.log(error);
    return handleApiError(error, req);
  }
}
