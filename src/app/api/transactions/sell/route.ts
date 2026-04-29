import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelper } from "@/app/api/utils/authHelper";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { Errors } from "@/app/api/lib/errors/errors";
import { sellSchema } from "@/app/validations/sell.schema";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { getRentableItem, updateItemStatus } from "@/app/api/utils/rentHelper";
import { upsertListingIndex } from "@/server/services/listing-index.service";

export async function POST(req: NextRequest) {
  const client = await authHelper();

  try {
    const body = await req.json();
    const { itemId, itemType } = sellSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      // 1️⃣ جلب العنصر
      const item = await getRentableItem(tx, itemType, itemId);

      if (!item) {
        throw Errors.VALIDATION("العنصر غير موجود");
      }

      if (item.status !== "AVAILABLE") {
        throw Errors.VALIDATION("العنصر غير متاح للبيع حالياً");
      }

      if (item.ownerId === client.id!) {
        throw Errors.VALIDATION("لا يمكنك شراء عنصر تملكه");
      }

      // 2️⃣ التحقق من عدم وجود عملية بيع نشطة للعنصر
      const existingTransaction = await tx.transaction.findFirst({
        where: {
          itemId,
          itemType,
          type: TransactionType.SELL,
          status: {
            in: ["PENDING", "APPROVED"],
          },
        },
      });

      if (existingTransaction) {
        throw Errors.VALIDATION("يوجد عرض بيع نشط لهذا العنصر بالفعل");
      }

      // 3️⃣ حساب العمولة بشكل صحيح
      const totalPrice = Number(item.price);

      const fee = await tx.platformFee.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });

      // ✅ صحيح: نضرب في الـ percent (من 0 إلى 100)
      const platformAmount = totalPrice * (Number(fee?.percent || 0) / 100);

      // 4️⃣ إنشاء عملية البيع
      const transaction = await tx.transaction.create({
        data: {
          ownerId: item.ownerId,
          clientId: client.id!,
          itemId,
          itemType,
          type: TransactionType.SELL,
          startDate: new Date(),
          endDate: new Date(),
          status: TransactionStatus.PENDING,
          totalPrice,
          totalPlatformFee: platformAmount,
        },
      });

      // 5️⃣ تسجيل عمولة المنصة
      await tx.platformBalance.create({
        data: {
          amount: platformAmount,
          transactionId: transaction.id,
        },
      });

      // 6️⃣ حجز العنصر
      await updateItemStatus(tx, itemType, itemId, "RESERVED");
    });

    // Sync search index: item became RESERVED
    void upsertListingIndex(
      itemId,
      itemType as import("@prisma/client").$Enums.ItemType,
    );

    return NextResponse.json(
      { success: true, message: "تم إرسال العرض بنجاح", itemId },
      { status: 201 },
    );
  } catch (error) {
    console.error("SELL ERROR:", error);
    return handleApiError(error, req);
  }
}
