import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelper } from "../../utils/authHelper";
import { Errors } from "../../lib/errors/errors";
import { handleApiError } from "../../lib/errors/errorHandler";

/**
 * @description Charging account by code
 * @access private (logged in user)
 * @method PUT
 * @route ~/api/charging_account
 */
export async function PUT(req: NextRequest) {
  try {
    // authenticated
    const user = await authHelper();
    // inputs
    const { code } = await req.json();
    if (!code) throw Errors.VALIDATION("يرجى إضافة رمز صالح");
    // vlidate
    const validCode = await prisma.activationCode.findUnique({
      where: { code },
    });
    // transaction
    const balance = await prisma.$transaction(async (tx) => {
      if (!validCode || validCode.used)
        throw Errors.VALIDATION("الرمز غير صالح أو مُستخدم سابقًا");

      const updateUserBalance = await tx.user.update({
        where: { id: user.id },
        data: { balance: { increment: validCode.balance } },
      });

      await tx.walletLedger.create({
        data: {
          userId: user.id,
          amount: validCode.balance,
          type: "CREDIT",
          referenceId: validCode.id,
        },
      });
      // Payment record
      await tx.payment.create({
        data: {
          payerId: user.id,
          amount: validCode.balance,
          method: "CARD",
          status: "COMPLETED",
        },
      });
      return updateUserBalance.balance;
    });

    if (typeof balance !== "number") {
      return NextResponse.json({ message: "فشل العملية" }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      message: "تم شحن رصيد حسابك بنجاح",
      balance,
    });
  } catch (error) {
    console.log(error);
    return handleApiError(error, req);
  }
}
