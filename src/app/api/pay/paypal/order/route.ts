import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPaypalOrder } from "@/lib/paypal";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

type OrderType = "ACTIVATION" | "SUBSCRIPTION" | "FEATURED_AD";

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
      key: "pay:paypal:order:post",
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

    const body = (await req.json()) as {
      amount?: number;
      type?: OrderType;
      itemId?: string;
      itemType?: string;
    };

    const type =
      body.type === "ACTIVATION" ||
      body.type === "SUBSCRIPTION" ||
      body.type === "FEATURED_AD"
        ? body.type
        : "SUBSCRIPTION";

    const settings = await prisma.appPaymentSettings.findUnique({
      where: { id: 1 },
      select: {
        subscriptionMonthlyPrice: true,
        featuredAdMonthlyPrice: true,
      },
    });

    const resolvedAmount =
      type === "FEATURED_AD"
        ? Number(settings?.featuredAdMonthlyPrice ?? 10)
        : Number(settings?.subscriptionMonthlyPrice ?? body.amount ?? 30);

    if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
      return NextResponse.json(
        { message: t("قيمة غير صحيحة", "Invalid amount") },
        { status: 400 },
      );
    }

    const payment = await prisma.payment.create({
      data: {
        payerId: session.user.id,
        amount: resolvedAmount,
        currency: "USD",
        method: "PAYPAL",
        status: "HOLD",
      },
      select: {
        id: true,
      },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin;
    const customId = JSON.stringify({
      paymentId: payment.id,
      userId: session.user.id,
      type,
      itemId: body.itemId,
      itemType: body.itemType,
    });

    const order = await createPaypalOrder({
      amount: resolvedAmount,
      currency: "USD",
      description:
        type === "FEATURED_AD"
          ? "Featured ad payment"
          : "Subscription activation payment",
      customId,
      returnUrl: `${baseUrl}/payment?gateway=paypal&status=success&type=${type}`,
      cancelUrl: `${baseUrl}/payment?gateway=paypal&status=cancelled&type=${type}`,
    });

    const approveUrl = order.links.find((link) => link.rel === "approve")?.href;

    if (!approveUrl) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });

      throw new Error("Failed to create PayPal approval link");
    }

    return NextResponse.json({
      ok: true,
      url: approveUrl,
      orderId: order.id,
      paymentId: payment.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create PayPal order";

    return NextResponse.json(
      { message: localizeErrorMessage(message, isArabic) },
      { status: 500 },
    );
  }
}
