import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { createPaypalOrder } from "@/lib/paypal";
import { enforceRateLimit } from "@/lib/rateLimit";
import { ensurePaymentSettings } from "@/lib/paymentSettings";
import type { ItemType } from "@prisma/client";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

const REFERRAL_DISCOUNT_RATE = 0.1;

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
      key: "pay:fatora:post",
      userId: session.user.id,
      limit: 15,
      windowMs: 60_000,
      errorMessage: t(
        "عدد كبير من محاولات الدفع، يرجى المحاولة بعد قليل",
        "Too many payment requests. Please try again shortly.",
      ),
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { amount, type, method, itemId, itemType } = (await req.json()) as {
      amount: number;
      type: "ACTIVATION" | "SUBSCRIPTION" | "FEATURED_AD";
      method?: "PAYPAL" | "CARD" | "SHAMCASH";
      itemId?: string;
      itemType?: ItemType;
    }; // type = "ACTIVATION" | "SUBSCRIPTION"

    const paymentMethod = method || "CARD";

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

    const paymentSettings = await ensurePaymentSettings();

    const normalizedAmount =
      type === "FEATURED_AD"
        ? paymentSettings.featuredAdMonthlyPrice
        : type === "SUBSCRIPTION"
          ? paymentSettings.subscriptionMonthlyPrice
          : Number(amount);

    if (!normalizedAmount || normalizedAmount <= 0) {
      return NextResponse.json(
        { message: t("قيمة غير صحيحة", "Invalid amount") },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, activeUntil: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: t("المستخدم غير موجود", "User not found") },
        { status: 404 },
      );
    }

    const referral = await prisma.referral.findFirst({
      where: { newUser: user.id },
      select: { id: true },
    });

    const canGetReferralDiscount =
      type !== "FEATURED_AD" && Boolean(referral && !user.activeUntil);
    const discountedAmount = canGetReferralDiscount
      ? Number((normalizedAmount * (1 - REFERRAL_DISCOUNT_RATE)).toFixed(2))
      : normalizedAmount;

    const payment = await prisma.payment.create({
      data: {
        payerId: session.user.id,
        amount: discountedAmount,
        currency: "USD",
        method:
          paymentMethod === "PAYPAL"
            ? "PAYPAL"
            : paymentMethod === "SHAMCASH"
              ? "SHAMCASH"
              : "CARD",
        status: "HOLD",
      },
    });

    if (paymentMethod === "PAYPAL") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!baseUrl) {
        return NextResponse.json(
          {
            message: localizeErrorMessage(
              "NEXT_PUBLIC_APP_URL is not configured",
              isArabic,
            ),
          },
          { status: 500 },
        );
      }

      const customIdPayload = {
        paymentId: payment.id,
        userId: session.user.id,
        type,
        itemId,
        itemType,
        referralDiscountApplied: canGetReferralDiscount,
        originalAmount: normalizedAmount,
        discountedAmount,
      };

      const paypalDescription =
        type === "ACTIVATION"
          ? canGetReferralDiscount
            ? "تفعيل حساب (خصم إحالة 10%)"
            : "تفعيل حساب"
          : type === "FEATURED_AD"
            ? "تثبيت إعلان مميز (30 يوم)"
            : canGetReferralDiscount
              ? "اشتراك شهري (خصم إحالة 10%)"
              : "اشتراك شهري";

      const order = await createPaypalOrder({
        amount: discountedAmount,
        currency: "USD",
        description: paypalDescription,
        customId: JSON.stringify(customIdPayload),
        returnUrl: `${baseUrl}/payment?gateway=paypal&status=success&type=${type}`,
        cancelUrl: `${baseUrl}/payment?gateway=paypal&status=cancelled&type=${type}`,
      });

      const approveLink = order.links.find(
        (link) => link.rel === "approve",
      )?.href;

      if (!approveLink) {
        return NextResponse.json(
          {
            message: localizeErrorMessage(
              "Failed to create PayPal approval link",
              isArabic,
            ),
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        url: approveLink,
        gateway: "PAYPAL",
        orderId: order.id,
        paymentId: payment.id,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "NEXT_PUBLIC_APP_URL is not configured",
            isArabic,
          ),
        },
        { status: 500 },
      );
    }

    const fatoraDescription =
      type === "ACTIVATION"
        ? canGetReferralDiscount
          ? "تفعيل حساب (خصم إحالة 10%)"
          : "تفعيل حساب"
        : type === "FEATURED_AD"
          ? "تثبيت إعلان مميز (30 يوم)"
          : canGetReferralDiscount
            ? "اشتراك شهري (خصم إحالة 10%)"
            : "اشتراك شهري";

    const res = await fetch("https://api-staging.fatora.io/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FATORA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: discountedAmount,
        currency: "USD",
        description: fatoraDescription,
        success_url: `${baseUrl}/payment?gateway=fatora&status=success&type=${type}&paymentId=${payment.id}`,
        failure_url: `${baseUrl}/payment?gateway=fatora&status=failed&type=${type}&paymentId=${payment.id}`,
        metadata: {
          paymentId: payment.id,
          userId: session.user.id,
          type,
          itemId,
          itemType,
          method: paymentMethod,
          referralDiscountApplied: canGetReferralDiscount,
          originalAmount: normalizedAmount,
          discountedAmount,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        {
          message: localizeErrorMessage(
            data?.message || "Failed to start payment",
            isArabic,
          ),
        },
        { status: res.status || 500 },
      );
    }

    return NextResponse.json({
      url: data.url,
      gateway: paymentMethod === "SHAMCASH" ? "SHAMCASH" : "CARD",
      paymentId: payment.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start payment";
    return NextResponse.json(
      {
        message: localizeErrorMessage(message, isArabic),
      },
      { status: 500 },
    );
  }
}
