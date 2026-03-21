import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { ensurePaymentSettings } from "@/lib/paymentSettings";
import { enqueueShamCashIncomingPaymentJob } from "@/lib/shamcashIncomingPaymentQueue";
import type { ItemType } from "@prisma/client";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

const REFERRAL_DISCOUNT_RATE = 0.1;

type RequestBody = {
  type?: "SUBSCRIPTION" | "FEATURED_AD";
  itemId?: string;
  itemType?: ItemType;
};

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

    const rateLimitResponse = await enforceRateLimit({
      req,
      key: "pay:shamcash:request:post",
      userId: session.user.id,
      limit: 20,
      windowMs: 60_000,
      errorMessage: t(
        "عدد كبير من المحاولات، يرجى الانتظار قليلاً",
        "Too many requests. Please wait a bit.",
      ),
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = (await req.json()) as RequestBody;
    const type = String(body.type || "SUBSCRIPTION")
      .trim()
      .toUpperCase() as "SUBSCRIPTION" | "FEATURED_AD";

    if (!["SUBSCRIPTION", "FEATURED_AD"].includes(type)) {
      return NextResponse.json(
        {
          message: t("نوع دفع غير صالح", "Invalid payment type"),
        },
        { status: 400 },
      );
    }

    const itemId = String(body.itemId || "").trim();
    const itemType = body.itemType;

    if (type === "FEATURED_AD" && (!itemId || !itemType)) {
      return NextResponse.json(
        {
          message: t(
            "بيانات الإعلان غير مكتملة",
            "Featured ad data is incomplete",
          ),
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        activeUntil: true,
      },
    });

    if (!user || !user.email) {
      return NextResponse.json(
        {
          message: t("المستخدم غير موجود", "User not found"),
        },
        { status: 404 },
      );
    }

    const paymentSettings = await ensurePaymentSettings();

    const originalAmount =
      type === "FEATURED_AD"
        ? paymentSettings.featuredAdMonthlyPrice
        : paymentSettings.subscriptionMonthlyPrice;

    if (!originalAmount || originalAmount <= 0) {
      return NextResponse.json(
        {
          message: t(
            "تعذر تحديد قيمة الدفع",
            "Unable to resolve payment amount",
          ),
        },
        { status: 400 },
      );
    }

    const referral =
      type === "FEATURED_AD"
        ? null
        : await prisma.referral.findFirst({
            where: { newUser: user.id },
            select: { id: true },
          });

    const canGetReferralDiscount = Boolean(
      referral && type !== "FEATURED_AD" && !user.activeUntil,
    );

    const discountedAmount = canGetReferralDiscount
      ? Number((originalAmount * (1 - REFERRAL_DISCOUNT_RATE)).toFixed(2))
      : originalAmount;

    const payment = await prisma.payment.create({
      data: {
        payerId: user.id,
        amount: discountedAmount,
        currency: "USD",
        method: "SHAMCASH",
        status: "HOLD",
      },
      select: {
        id: true,
        amount: true,
        currency: true,
      },
    });

    try {
      const job = await enqueueShamCashIncomingPaymentJob({
        paymentId: payment.id,
        userId: user.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        type,
        itemId: type === "FEATURED_AD" ? itemId : "",
        itemType: type === "FEATURED_AD" ? itemType : undefined,
        expectedEmail: user.email,
        expectedNote: user.email,
        referralDiscountApplied: canGetReferralDiscount,
        originalAmount,
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          title: t("⏳ طلبك قيد المراجعة", "⏳ Your request is under review"),
          message: t(
            `تم استلام طلب الدفع بقيمة ${Number(payment.amount).toFixed(2)} USD وهو الآن قيد المراجعة.`,
            `Your ${Number(payment.amount).toFixed(2)} USD payment request has been received and is now under review.`,
          ),
        },
      });

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        queueJobId: job.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        expectedNote: user.email,
        message: t(
          "تم استلام طلبك وهو قيد المراجعة الآن.",
          "Your request has been received and is now under review.",
        ),
      });
    } catch (queueError) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });

      const queueMessage =
        queueError instanceof Error
          ? queueError.message
          : "Failed to queue ShamCash incoming payment";

      return NextResponse.json(
        {
          message: t(
            "تعذر بدء مراجعة الدفع عبر ShamCash حالياً. حاول مجدداً بعد قليل.",
            `Could not start ShamCash verification right now. Please retry shortly. (${queueMessage})`,
          ),
        },
        { status: 503 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json(
      { message: localizeErrorMessage(message, isArabic) },
      { status: 500 },
    );
  }
}
