import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  Availability,
  PurchaseRequestStatus,
  TransactionStatus,
  TransactionType,
  NotificationType,
} from "@prisma/client";
import { authHelper } from "@/app/api/utils/authHelper";
import { convertToTransactionSchema } from "@/app/validations/purchaseValidations";
import { Errors } from "@/app/api/lib/errors/errors";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";

/**
 * @description Convert Purchase Request to Transaction
 * @route POST /api/purchase/convert_to_transaction
 * @access Admin (assigned only)
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await authHelper();

    if (!admin.isAdmin) {
      throw Errors.FORBIDDEN("هذه العملية مخصصة للإدارة فقط");
    }

    const body = await req.json();
    const { requestId, finalPrice, platformFeePercent } =
      convertToTransactionSchema.parse(body);

    /* =========================
       GET REQUEST
    ========================= */
    const request = await prisma.purchaseRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw Errors.NOT_FOUND("طلب الشراء غير موجود");
    }

    if (request.assignedAdminId !== admin.id) {
      throw Errors.FORBIDDEN("لا تملك صلاحية تنفيذ هذه العملية");
    }

    if (request.status !== PurchaseRequestStatus.OWNER_ACCEPTED) {
      throw Errors.VALIDATION("لا يمكن تحويل الطلب في حالته الحالية");
    }

    /* =========================
       GET ITEM
    ========================= */
    let item: { id: string; ownerId: string; status: Availability } | null =
      null;

    switch (request.itemType) {
      case "NEW_CAR":
        item = await prisma.newCar.findUnique({
          where: { id: request.itemId },
          select: { id: true, ownerId: true, status: true },
        });
        break;
      case "USED_CAR":
        item = await prisma.oldCar.findUnique({
          where: { id: request.itemId },
          select: { id: true, ownerId: true, status: true },
        });
        break;
      case "PROPERTY":
        item = await prisma.property.findUnique({
          where: { id: request.itemId },
          select: { id: true, ownerId: true, status: true },
        });
        break;
      case "OTHER":
        item = await prisma.otherItem.findUnique({
          where: { id: request.itemId },
          select: { id: true, ownerId: true, status: true },
        });
        break;
    }

    if (!item) {
      throw Errors.NOT_FOUND("العنصر غير موجود");
    }

    if (item.status === Availability.SOLD) {
      throw Errors.VALIDATION("العنصر مباع مسبقًا");
    }

    /* =========================
       CALCULATIONS
    ========================= */
    const feePercent = platformFeePercent ?? 5;
    const platformFee = (Number(finalPrice) * Number(feePercent)) / 100;

    /* =========================
       TRANSACTION (ATOMIC)
    ========================= */
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create Transaction
      const newTransaction = await tx.transaction.create({
        data: {
          ownerId: item.ownerId,
          clientId: request.buyerId,
          itemId: request.itemId,
          itemType: request.itemType,
          type: TransactionType.SELL,
          status: TransactionStatus.COMPLETED,
          totalPrice: finalPrice,
          totalPlatformFee: platformFee,
        },
      });

      // 2. Update Item Status
      switch (request.itemType) {
        case "NEW_CAR":
          await tx.newCar.update({
            where: { id: item.id },
            data: { status: Availability.SOLD },
          });
          break;
        case "USED_CAR":
          await tx.oldCar.update({
            where: { id: item.id },
            data: { status: Availability.SOLD },
          });
          break;
        case "PROPERTY":
          await tx.property.update({
            where: { id: item.id },
            data: { status: Availability.SOLD },
          });
          break;
        case "OTHER":
          await tx.otherItem.update({
            where: { id: item.id },
            data: { status: Availability.SOLD },
          });
          break;
      }

      // 3. Update Purchase Request
      await tx.purchaseRequest.update({
        where: { id: requestId },
        data: {
          status: PurchaseRequestStatus.CONVERTED_TO_TRANSACTION,
        },
      });

      return newTransaction;
    });

    /* =========================
       NOTIFICATIONS
    ========================= */

    // Buyer
    await prisma.notification.create({
      data: {
        userId: request.buyerId,
        title: "تمت  عملية الشراء",
        message: "تم تحويل طلب الشراء إلى عقد رسمي.",
        type: NotificationType.INFO,
      },
    });

    // Owner
    await prisma.notification.create({
      data: {
        userId: item.ownerId,
        title: "تم توثيق عملية البيع",
        message: "تم توثيق عملية البيع بنجاح وتحويلها إلى معاملة رسمية.",
        type: NotificationType.INFO,
      },
    });

    return NextResponse.json(
      {
        message: "تم تحويل الطلب إلى معاملة بنجاح",
        transactionId: transaction.id,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Convert To Transaction Error:", error);
    return handleApiError(error, req);
  }
}
