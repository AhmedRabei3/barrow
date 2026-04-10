import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPaypalPayout } from "@/lib/paypal";
import { recordPlatformProfitLedgerEntries } from "@/lib/platformProfitLedger";

export async function POST(req: NextRequest) {
  const requestedLang =
    req.headers.get("x-lang") || req.headers.get("accept-language") || "";
  const isArabic = requestedLang.toLowerCase().startsWith("ar");
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: t("غير مصرح", "Unauthorized") },
      { status: 401 },
    );
  }

  const body = (await req.json()) as {
    paypalEmail?: string;
    amount?: number;
  };

  const paypalEmail = String(body.paypalEmail || "").trim();
  const amount = Number(body.amount ?? 0);

  if (!paypalEmail || !paypalEmail.includes("@")) {
    return NextResponse.json(
      {
        message: t(
          "يلزم إدخال بريد PayPal صالح",
          "Valid PayPal email is required",
        ),
      },
      { status: 400 },
    );
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      {
        message: t(
          "قيمة السحب يجب أن تكون أكبر من 0",
          "Withdrawal amount must be greater than 0",
        ),
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      balance: true,
      pendingReferralEarnings: true,
      isActive: true,
      isDeleted: true,
      activeUntil: true,
    },
  });

  if (!user || user.isDeleted) {
    return NextResponse.json(
      { message: t("المستخدم غير موجود", "User not found") },
      { status: 404 },
    );
  }

  const now = new Date();
  const isSubscriptionValid =
    user.isActive && user.activeUntil && new Date(user.activeUntil) > now;

  if (!isSubscriptionValid) {
    return NextResponse.json(
      {
        message: t(
          "يجب أن يكون الاشتراك فعالًا لسحب الأرباح وفق سياسة البرنامج",
          "Subscription must be active to withdraw earnings according to program rules",
        ),
      },
      { status: 403 },
    );
  }

  const currentBalance = Number(user.balance ?? 0);

  if (amount > currentBalance) {
    return NextResponse.json(
      {
        message: t(
          "الرصيد الجاهز غير كافٍ لإتمام السحب",
          "Insufficient ready balance for withdrawal",
        ),
      },
      { status: 400 },
    );
  }

  try {
    const payout = await createPaypalPayout({
      amount,
      receiverEmail: paypalEmail,
      note: "Platform earnings withdrawal",
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: amount },
        },
      });

      await tx.chargingLog.create({
        data: {
          userId: user.id,
          type: "PAYPAL_WITHDRAWAL",
          amount: -Math.abs(amount),
        },
      });

      await recordPlatformProfitLedgerEntries(tx, [
        {
          type: "USER_WITHDRAWAL_LIABILITY_RELEASE",
          amount,
          userId: user.id,
          referenceId: user.id,
          note: "PayPal withdrawal reduced ready user liability",
        },
      ]);

      await tx.notification.create({
        data: {
          userId: user.id,
          title: "🏦 تم إرسال طلب سحب PayPal",
          message: `تم إنشاء عملية سحب بقيمة ${amount.toFixed(2)}$ إلى ${paypalEmail}.`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      payoutBatchId: payout.batch_header?.payout_batch_id,
      payoutStatus: payout.batch_header?.batch_status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Withdrawal failed";
    return NextResponse.json(
      {
        message: t("تعذر تنفيذ السحب", message),
      },
      { status: 500 },
    );
  }
}
