import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionType, TransactionStatus } from "@prisma/client";
import { authHelper } from "../../utils/authHelper";
import { Errors } from "../../lib/errors/errors";
import { rentSchema } from "@/app/validations/rent.schema";
import { handleApiError } from "../../lib/errors/errorHandler";
import {
  assertNoTransactionConflict,
  calculateRentUnits,
  getRentableItem,
  updateItemStatus,
} from "../../utils/rentHelper";
import { upsertListingIndex } from "@/server/services/listing-index.service";

/**
 * @description route to rent item
 * @route ~/api/transactions/rent
 * @access private logged in user
 */
export async function POST(req: NextRequest) {
  const client = await authHelper();

  try {
    const body = await req.json();
    const { itemId, itemType, startDate, endDate } = rentSchema.parse(body);

    const start = new Date(startDate);
    const end = new Date(endDate);

    await prisma.$transaction(async (tx) => {
      const item = await getRentableItem(tx, itemType, itemId);

      if (!item || item.status !== "AVAILABLE") {
        throw Errors.VALIDATION("العنصر غير متاح حالياً");
      }

      if (!item.rentType) {
        throw Errors.VALIDATION("هذا العنصر غير متاح للإيجار");
      }

      if (item.ownerId === client.id) {
        throw Errors.VALIDATION("لا يمكنك تأجير عنصر تملكه");
      }

      await assertNoTransactionConflict({
        itemId,
        itemType,
        start,
        end,
      });

      const duration = calculateRentUnits({
        startDate: start,
        endDate: end,
        rentType: item.rentType,
      });

      const totalPrice = Number(item.price) * duration;

      const fee = await tx.platformFee.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });

      const platformAmount = totalPrice * Number(fee?.percent || 0);

      const transaction = await tx.transaction.create({
        data: {
          ownerId: item.ownerId,
          clientId: client.id!,
          itemId,
          itemType,
          type: TransactionType.RENT,
          startDate: start,
          endDate: end,
          status: TransactionStatus.PENDING,
          totalPrice,
          totalPlatformFee: platformAmount,
        },
      });

      await tx.platformBalance.create({
        data: {
          amount: platformAmount,
          transactionId: transaction.id,
        },
      });

      await updateItemStatus(tx, itemType, itemId, "RESERVED");
    });

    // Sync search index: item became RESERVED
    void upsertListingIndex(
      itemId,
      itemType as import("@prisma/client").$Enums.ItemType,
    );

    return NextResponse.json({ success: true, itemId }, { status: 201 });
  } catch (error) {
    console.error("RENT ERROR:", error);
    return handleApiError(error, req);
  }
}
