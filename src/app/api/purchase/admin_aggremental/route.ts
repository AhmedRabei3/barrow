import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationType, PurchaseRequestStatus } from "@prisma/client";
import { authHelper } from "@/app/api/utils/authHelper";
import { adminDecisionSchemaWithLogic } from "@/app/validations/purchaseValidations";
import { Errors } from "@/app/api/lib/errors/errors";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";

/**
 * @description راوت الإجراءات الخاصة بالمدير الخاصة بالشراء
 * @param req body = {requestId , decision , adminNote}
 * @route ~/api/purchase/admin_aggremental
 */

export async function POST(req: NextRequest) {
  try {
    const admin = await authHelper();

    if (!admin.isAdmin) {
      throw Errors.FORBIDDEN("عذراً فهذا من صلاحيات المدير فقط");
    }

    const body = await req.json();
    const { requestId, decision, adminNote } =
      adminDecisionSchemaWithLogic.parse(body);

    const request = await prisma.purchaseRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw Errors.NOT_FOUND("لم نعثر على طلب الشراء , أو أنه ألغي");
    }

    if (request.assignedAdminId && request.assignedAdminId !== admin.id) {
      throw Errors.FORBIDDEN("هذا الطلب تجري متابعته من مشرف آخر ");
    }

    /* =========================
       ADMIN REJECT
    ========================= */
    if (decision === "REJECT") {
      await prisma.purchaseRequest.update({
        where: { id: requestId },
        data: {
          status: PurchaseRequestStatus.ADMIN_REJECTED,
        },
      });

      await prisma.notification.create({
        data: {
          userId: request.buyerId,
          title: "تم رفض طلب الشراء",
          message: adminNote || "تم رفض الطلب من قبل الإدارة",
          type: NotificationType.INFO,
        },
      });

      return NextResponse.json({
        message: "تم رفض الطلب",
      });
    }

    /* =========================
       ADMIN APPROVE
    ========================= */
    let item: {
      ownerId: string;
      name?: string | null;
      title?: string | null;
      model?: string | null;
    } | null = null;

    switch (request.itemType) {
      case "NEW_CAR":
        item = await prisma.newCar.findUnique({
          where: { id: request.itemId },
          select: { ownerId: true, model: true },
        });
        break;
      case "USED_CAR":
        item = await prisma.oldCar.findUnique({
          where: { id: request.itemId },
          select: { ownerId: true, model: true },
        });
        break;
      case "PROPERTY":
        item = await prisma.property.findUnique({
          where: { id: request.itemId },
          select: { ownerId: true, title: true },
        });
        break;
      case "OTHER":
        item = await prisma.otherItem.findUnique({
          where: { id: request.itemId },
          select: { ownerId: true, name: true },
        });
        break;
    }

    if (!item) {
      throw Errors.NOT_FOUND("العنصر غير موجود");
    }

    await prisma.purchaseRequest.update({
      where: { id: requestId },
      data: {
        status: PurchaseRequestStatus.PENDING_OWNER,
        assignedAdminId: admin.id,
      },
    });

    /* إشعار المشتري */
    await prisma.notification.create({
      data: {
        userId: request.buyerId,
        title: `طلب شراء ${item.name || item.title || item.model}`,
        message: "تمت الموافقة المبدئية على طلبك، بانتظار رد مالك العنصر.",
        type: NotificationType.INFO,
      },
    });

    /* إشعار المالك */
    await prisma.notification.create({
      data: {
        userId: item.ownerId,
        title: "طلب شراء جديد",
        message: `
        لديك طلب شراء جديد على العنصر:
        ${item.title || item.name || item.model || ""}

        يرجى قبول أو رفض الطلب.
        `,
        type: NotificationType.PURCHASEREQUEST,
      },
    });

    return NextResponse.json({
      message: "تم تمرير الطلب إلى مالك العنصر",
    });
  } catch (error: unknown) {
    console.error("Admin Purchase Decision Error:", error);
    return handleApiError(error, req);
  }
}
