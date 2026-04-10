import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "../../utils/authHelper";
import { handleApiError } from "../../lib/errors/errorHandler";
import { prisma } from "@/lib/prisma";
import { NotificationType, SupportSenderRole } from "@prisma/client";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { recordPlatformProfitLedgerEntries } from "@/lib/platformProfitLedger";

/**
 * @description مسار تصفير رصيد المستخدم بعد قيام الأدمن بتحويل الرصيد له
 * @access private (Admin only)
 * @route ~api/admin/achivment
 * @method POST
 */

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const admin = await requireAdminUser();
  const { userId, amount, ticketId } = (await req.json()) as {
    userId?: string;
    amount?: number;
    ticketId?: string;
  };

  if (!userId) {
    return NextResponse.json(
      { message: localizeErrorMessage("User ID is required", isArabic) },
      { status: 400 },
    );
  }
  try {
    // Logic to process achivment withdrawal
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        balance: true,
        name: true,
      },
    });
    if (!user) {
      return NextResponse.json(
        { message: localizeErrorMessage("User not found", isArabic) },
        { status: 404 },
      );
    }
    const currentBalance = Number(user.balance ?? 0);
    if (currentBalance <= 0 || !user.balance) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Insufficient balance for withdrawal",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    const requestedAmount = Number(amount ?? 0);
    const settleAmount =
      Number.isFinite(requestedAmount) && requestedAmount > 0
        ? requestedAmount
        : currentBalance;

    if (settleAmount > currentBalance) {
      return NextResponse.json(
        {
          message: t(
            "قيمة السحب المطلوبة أكبر من الرصيد الجاهز",
            "Requested withdrawal amount exceeds ready balance",
          ),
        },
        { status: 400 },
      );
    }

    const isFullSettlement = settleAmount === currentBalance;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          balance: isFullSettlement
            ? 0
            : {
                decrement: settleAmount,
              },
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: t("طلب سحب", "Withdrawal request"),
          message: isFullSettlement
            ? t(
                "تم تحويل كامل رصيدك الجاهز إلى محفظتك بنجاح",
                "Your full ready balance has been transferred successfully",
              )
            : t(
                `تم تحويل مبلغ ${settleAmount.toFixed(2)} من رصيدك إلى محفظتك بنجاح`,
                `${settleAmount.toFixed(2)} has been transferred from your balance successfully`,
              ),
          type: NotificationType.INFO,
        },
      });

      await tx.chargingLog.create({
        data: {
          userId,
          type: "MANUAL_WITHDRAWAL_SETTLED",
          amount: -Math.abs(settleAmount),
        },
      });

      await recordPlatformProfitLedgerEntries(tx, [
        {
          type: "USER_WITHDRAWAL_LIABILITY_RELEASE",
          amount: settleAmount,
          userId,
          referenceId: ticketId || userId,
          note: "Manual admin withdrawal settlement reduced ready user liability",
        },
      ]);

      if (ticketId) {
        await tx.supportTicketMessage.create({
          data: {
            ticketId,
            senderId: admin.id,
            senderRole: SupportSenderRole.ADMIN,
            body: isFullSettlement
              ? t(
                  "تم تحويل كامل المبلغ وإقفال الطلب.",
                  "Full amount has been transferred and the request is now closed.",
                )
              : t(
                  `تم تحويل ${settleAmount.toFixed(2)} وخصمه من رصيدك الجاهز.`,
                  `${settleAmount.toFixed(2)} has been transferred and deducted from your ready balance.`,
                ),
          },
        });

        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: "CLOSED" },
        });
      }
    });

    return NextResponse.json({
      message: t(
        `تمت تسوية سحب ${user.name} بقيمة ${settleAmount.toFixed(2)} بنجاح`,
        `${user.name} withdrawal settlement (${settleAmount.toFixed(2)}) completed successfully`,
      ),
      settledAmount: settleAmount,
      remainingBalance: Number((currentBalance - settleAmount).toFixed(2)),
      fullSettlement: isFullSettlement,
    });
  } catch (e) {
    console.log(e);
    return handleApiError(e, req);
  }
}
