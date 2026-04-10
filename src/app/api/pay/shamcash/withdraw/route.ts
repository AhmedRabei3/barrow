import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: t("غير مصرح", "Unauthorized") },
        { status: 401 },
      );
    }

    const sessionUserId = session.user.id;

    const rateLimitResponse = await enforceRateLimit({
      req,
      key: "pay:shamcash:withdraw:post",
      userId: sessionUserId,
      limit: 10,
      windowMs: 60_000,
      errorMessage: t(
        "عدد كبير من محاولات السحب، يرجى المحاولة بعد قليل",
        "Too many withdrawal requests. Please try again shortly.",
      ),
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = (await req.json()) as {
      walletCode?: string;
      amount?: number;
      note?: string;
    };

    const inputWalletCode = String(body.walletCode || "").trim();
    const walletCode = inputWalletCode || `UID-${sessionUserId}`;
    const amount = Number(body.amount ?? 0);
    const inputNote = String(body.note || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Withdrawal amount must be greater than 0",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    const defaultWithdrawalNote = t(
      `لقد سحبت مبلغ ${amount.toFixed(2)} USD من موقع الدليل الآمن.`,
      `You withdrew ${amount.toFixed(2)} USD from Dalil Safe platform.`,
    );
    const note = inputNote || defaultWithdrawalNote;

    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: {
        id: true,
        name: true,
        email: true,
        balance: true,
        isActive: true,
        isDeleted: true,
        isOwner: true,
        activeUntil: true,
      },
    });

    if (!user || user.isDeleted) {
      return NextResponse.json(
        { message: localizeErrorMessage("User not found", isArabic) },
        { status: 404 },
      );
    }

    const now = new Date();
    const isSubscriptionValid =
      user.isActive && user.activeUntil && new Date(user.activeUntil) > now;

    if (!user.isOwner && !isSubscriptionValid) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Subscription must be active to withdraw earnings according to program rules",
            isArabic,
          ),
        },
        { status: 403 },
      );
    }

    const currentBalance = Number(user.balance ?? 0);
    if (amount > currentBalance) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Insufficient ready balance for withdrawal",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    const manualRequest = await prisma.shamCashManualWithdrawal.create({
      data: {
        userId: user.id,
        amount,
        currency: "USD",
        walletCode,
        qrCode: null,
        note,
        status: "PENDING_ADMIN",
      },
      select: { id: true },
    });

    const admins = await prisma.user.findMany({
      where: {
        isDeleted: false,
        OR: [{ isAdmin: true }, { isOwner: true }],
      },
      select: { id: true },
    });

    const userMessage = t(
      `تم استلام طلب السحب بقيمة ${amount.toFixed(2)} USD وهو الآن بانتظار مراجعة الإدارة.`,
      `Your withdrawal request for ${amount.toFixed(2)} USD has been received and is awaiting admin review.`,
    );

    const displayName = user.name?.trim() || user.email?.trim() || user.id;
    const adminMessage = [
      t(
        `طلب سحب ShamCash جديد للمستخدم ${displayName} بانتظار المعالجة اليدوية.`,
        `A new ShamCash withdrawal request for ${displayName} is awaiting manual processing.`,
      ),
      `SCW_REQUEST_ID:${manualRequest.id}`,
    ].join("\n");

    await Promise.all([
      prisma.notification.create({
        data: {
          userId: user.id,
          title: t("⏳ طلبك قيد المراجعة", "⏳ Your request is under review"),
          message: userMessage,
        },
      }),
      ...admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            title: t(
              "🚨 طلب سحب ShamCash يدوي جديد",
              "🚨 New manual ShamCash withdrawal request",
            ),
            message: adminMessage,
          },
        }),
      ),
    ]);

    return NextResponse.json(
      {
        success: true,
        manualRequestId: manualRequest.id,
        mode: "MANUAL_ADMIN_REVIEW",
        message: t(
          "تم استلام طلبك وهو قيد المراجعة الآن.",
          "Your request has been received and is now under review.",
        ),
      },
      { status: 202 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to process ShamCash withdrawal";

    return NextResponse.json(
      {
        message: isArabic ? localizeErrorMessage(message, true) : message,
      },
      { status: 500 },
    );
  }
}
