import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PurchaseRequestStatus, NotificationType } from "@prisma/client";
import { authHelper } from "@/app/api/utils/authHelper";
import { adminClaimPurchaseRequestSchema } from "@/app/validations/purchaseValidations";
import { translateZodError } from "@/app/api/lib/errors/zodTranslator";
import { Errors } from "@/app/api/lib/errors/errors";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";

/**
 * @description Admin claims a purchase request
 * @route POST /api/purchase/admin_claim
 * @access Admin only
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await authHelper();

    if (!admin.isAdmin) {
      throw Errors.FORBIDDEN("هذه العملية متاحة للمدراء فقط");
    }

    const body = await req.json();
    const parsed = adminClaimPurchaseRequestSchema.safeParse(body);
    if (!parsed.success) {
      const { message, field } = translateZodError(parsed.error);
      throw Errors.VALIDATION(message, field);
    }
    const request = await prisma.purchaseRequest.findUnique({
      where: { id: parsed.data?.requestId },
    });

    if (!request) {
      throw Errors.NOT_FOUND("طلب الشراء غير موجود أو تم إلغاؤه");
    }

    if (request.status !== PurchaseRequestStatus.PENDING_ADMIN) {
      throw Errors.VALIDATION("لا يمكن استلام هذا الطلب");
    }

    if (request.assignedAdminId) {
      throw Errors.VALIDATION("تم استلام الطلب بالفعل من قبل مدير آخر");
    }

    /* =========================
       CLAIM REQUEST
    ========================= */
    await prisma.purchaseRequest.update({
      where: { id: parsed.data.requestId },
      data: {
        assignedAdminId: admin.id,
        status: PurchaseRequestStatus.PENDING_OWNER,
      },
    });

    /* إشعار المشتري */
    await prisma.notification.create({
      data: {
        userId: request.buyerId,
        title: "طلب الشراء قيد المراجعة",
        message:
          "تم استلام طلب الشراء الخاص بك من قبل الإدارة، وسيتم التواصل معك قريبًا.",
        type: NotificationType.INFO,
      },
    });

    return NextResponse.json({
      message: "تم استلامُ الطلبِ بنجاحٍ وأصبحتَ المشرفَ عليهِ",
    });
  } catch (error: unknown) {
    console.error("Admin Claim Error:", error);
    return handleApiError(error, req);
  }
}
