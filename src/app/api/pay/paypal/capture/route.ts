import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { capturePaypalOrder } from "@/lib/paypal";
import { applySubscriptionActivation } from "@/lib/subscriptionActivation";
import { applyFeaturedAdActivation } from "@/lib/featuredAds";
import type { ItemType } from "@prisma/client";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

export async function POST(req: NextRequest) {
  try {
    const isArabic = resolveIsArabicFromRequest(req);
    const t = (ar: string, en: string) => (isArabic ? ar : en);

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: t("غير مصرح", "Unauthorized") },
        { status: 401 },
      );
    }

    const rateLimitResponse = await enforceRateLimit({
      req,
      key: "pay:paypal:capture:post",
      userId: session.user.id,
      limit: 20,
      windowMs: 60_000,
      errorMessage: t(
        "عدد كبير من محاولات تأكيد الدفع، يرجى الانتظار ثم إعادة المحاولة",
        "Too many capture attempts. Please wait and retry.",
      ),
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { orderId } = (await req.json()) as { orderId?: string };
    if (!orderId) {
      return NextResponse.json(
        { message: localizeErrorMessage("orderId is required", isArabic) },
        { status: 400 },
      );
    }

    const capture = await capturePaypalOrder(orderId);
    const customIdRaw = capture.purchase_units?.[0]?.custom_id;

    if (!customIdRaw) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Missing PayPal custom_id in capture response",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    let customIdPayload: {
      paymentId?: string;
      userId?: string;
      type?: "ACTIVATION" | "SUBSCRIPTION" | "FEATURED_AD";
      itemId?: string;
      itemType?: ItemType;
      referralDiscountApplied?: boolean;
      originalAmount?: number;
      discountedAmount?: number;
    };

    try {
      customIdPayload = JSON.parse(customIdRaw) as {
        paymentId?: string;
        userId?: string;
      };
    } catch {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Invalid PayPal custom_id payload",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    if (
      !customIdPayload.paymentId ||
      customIdPayload.userId !== session.user.id
    ) {
      return NextResponse.json(
        {
          message: localizeErrorMessage("Pending payment not found", isArabic),
        },
        { status: 404 },
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: customIdPayload.paymentId,
        payerId: session.user.id,
        status: "HOLD",
        method: "PAYPAL",
      },
      select: {
        id: true,
        amount: true,
        payerId: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        {
          message: localizeErrorMessage("Pending payment not found", isArabic),
        },
        { status: 404 },
      );
    }

    const captureAmountRaw =
      capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
    const paidAmount = Number(captureAmountRaw ?? payment.amount ?? 0);
    const paymentType = customIdPayload.type || "SUBSCRIPTION";

    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return NextResponse.json(
        { message: localizeErrorMessage("Invalid captured amount", isArabic) },
        { status: 400 },
      );
    }

    let newActiveUntil: Date;

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED" },
      });

      if (paymentType === "FEATURED_AD") {
        if (!customIdPayload.itemId || !customIdPayload.itemType) {
          throw new Error("FEATURED_AD payment is missing item data");
        }

        await applyFeaturedAdActivation({
          tx,
          userId: session.user.id,
          itemId: customIdPayload.itemId,
          itemType: customIdPayload.itemType,
          sourceLabel: "PayPal",
        });
        newActiveUntil = new Date();
      } else {
        const result = await applySubscriptionActivation({
          tx,
          userId: session.user.id,
          subscriptionAmount: paidAmount,
          sourceLabel: "PayPal",
        });

        newActiveUntil = result.newActiveUntil;
      }
    });

    return NextResponse.json({
      success: true,
      captureId: capture.id,
      activeUntil: paymentType === "FEATURED_AD" ? null : newActiveUntil!.toISOString(),
      type: paymentType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Capture failed";
    const requestedLang = resolveIsArabicFromRequest(req);

    if (message.includes("ORDER_NOT_APPROVED")) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "PayPal order is not approved yet",
            requestedLang,
          ),
        },
        { status: 409 },
      );
    }

    if (message === "Renewal is only allowed during the grace period") {
      return NextResponse.json(
        { message: localizeErrorMessage(message, requestedLang) },
        { status: 403 },
      );
    }

    if (message === "User not found") {
      return NextResponse.json(
        { message: localizeErrorMessage(message, requestedLang) },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: localizeErrorMessage(message, requestedLang) },
      { status: 500 },
    );
  }
}
