import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  Availability,
  NotificationType,
  PurchaseRequestStatus,
} from "@prisma/client";
import { authHelper } from "@/app/api/utils/authHelper";
import { ownerDecisionSchema } from "@/app/validations/purchaseValidations";
import { Errors } from "@/app/api/lib/errors/errors";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { findItemByType } from "@/app/api/items/functions/helpers";

/**
 * @description owner decision
 * @param body = {requestId , decision , phoneNumber}
 * @route ~/api/purchase/owner_deciosin
 * @access private owner only
 * @method POST
 */
export async function POST(req: NextRequest) {
  try {
    const owner = await authHelper();

    const body = await req.json();
    const { requestId, decision, ownerPhoneNumber } =
      ownerDecisionSchema.parse(body);

    const request = await prisma.purchaseRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw Errors.NOT_FOUND("طلب الشراء غير موجود");
    }

    const item = await findItemByType(request.itemType, request.itemId);

    if (!item || item.status !== Availability.AVAILABLE) {
      throw Errors.NOT_FOUND("العنصر مباع أو غير متوفر");
    }

    if (item.ownerId !== owner.id) {
      throw Errors.FORBIDDEN("أنت لست مالك هذا العنصر");
    }
    /* =========================
       OWNER DECLINE
    ========================= */
    if (decision === "DECLINE") {
      await prisma.purchaseRequest.update({
        where: { id: requestId },
        data: {
          status: PurchaseRequestStatus.OWNER_DECLINED,
        },
      });

      /* إشعار المشتري */
      await prisma.notification.create({
        data: {
          userId: request.buyerId,
          title: "طلب شراء/إيجار",
          message:
            "لايريد مالك العنصر إتمام عملية الشراء/الإيجار. يمكنك البحث عن عناصر أخرى.",
          type: NotificationType.INFO,
        },
      });

      return NextResponse.json({
        message: "تم رفض الطلب من قبل مالك العنصر",
      });
    }

    /* =========================
       OWNER ACCEPT
    ========================= */
    await prisma.purchaseRequest.update({
      where: { id: requestId },
      data: {
        status: PurchaseRequestStatus.OWNER_ACCEPTED,
        ownerPhoneNumber: ownerPhoneNumber,
      },
    });

    const itemLabel =
      ("name" in item && item.name) ||
      ("title" in item && item.title) ||
      ("brand" in item && item.brand) ||
      "عنصر";

    /* إشعار المشتري */
    await prisma.notification.create({
      data: {
        userId: request.buyerId,
        title: `طلب شراء ${itemLabel}`,
        message:
          "وافق مالك العنصر على طلب الشراء. سيتم التواصل معك لإتمام العقد.",
        type: NotificationType.INFO,
      },
    });

    return NextResponse.json({
      message: "سيتم الاتصال بك قريباً لإتمام إجراءات البيع",
    });
  } catch (error: unknown) {
    console.error("Owner Decision Error:", error);
    return handleApiError(error, req);
  }
}
