import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { applySubscriptionActivation } from "@/lib/subscriptionActivation";
import { applyFeaturedAdActivation } from "@/lib/featuredAds";
import type { ItemType } from "@prisma/client";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

function verifySignature(payload: string, signature: string) {
  const secret = process.env.FATORA_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const expected = hmac.digest("hex");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const rawBody = await req.text();
  const signature = req.headers.get("x-fatora-signature");

  if (!signature || !verifySignature(rawBody, signature)) {
    return NextResponse.json(
      { message: localizeErrorMessage("Invalid signature", isArabic) },
      { status: 401 },
    );
  }

  let event: {
    status?: string;
    metadata?: {
      paymentId?: string;
      userId?: string;
      type?: string;
      itemId?: string;
      itemType?: string;
      referralDiscountApplied?: boolean;
      originalAmount?: number | string;
      discountedAmount?: number | string;
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { message: localizeErrorMessage("Invalid webhook payload", isArabic) },
      { status: 400 },
    );
  }

  const { status } = event;
  const metadata = event.metadata ?? {};

  if (status !== "PAID") {
    return NextResponse.json({ received: true });
  }

  const {
    paymentId,
    userId,
    type,
    itemId,
    itemType,
    referralDiscountApplied,
    originalAmount,
    discountedAmount,
  } = metadata;

  if (!paymentId || !userId) {
    return NextResponse.json(
      { message: localizeErrorMessage("Invalid webhook payload", isArabic) },
      { status: 400 },
    );
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    return NextResponse.json(
      { message: localizeErrorMessage("Payment not found", isArabic) },
      { status: 404 },
    );
  }

  if (payment.status === "COMPLETED") {
    return NextResponse.json({ success: true, duplicated: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "COMPLETED" },
    });

    if (type === "FEATURED_AD") {
      if (!itemId || !itemType) {
        throw new Error("FEATURED_AD payload is missing item data");
      }

      await applyFeaturedAdActivation({
        tx,
        userId,
        itemId,
        itemType: itemType as ItemType,
        sourceLabel: "البطاقة / ShamCash",
      });
    } else {
      await applySubscriptionActivation({
        tx,
        userId,
        subscriptionAmount: Number(payment.amount),
        sourceLabel: "البطاقة / ShamCash",
      });

      if (referralDiscountApplied) {
        const original = Number(originalAmount ?? 0);
        const discounted = Number(discountedAmount ?? 0);
        const savedAmount = Number((original - discounted).toFixed(2));

        if (savedAmount > 0) {
          await tx.notification.create({
            data: {
              userId,
              title: "🎁 تم تطبيق خصم الإحالة",
              message: `تم تطبيق خصم إحالة 10% على اشتراكك (وفرت ${savedAmount}$). شكرًا لاستخدام رابط الدعوة!`,
            },
          });
        }
      }
    }
  });

  return NextResponse.json({ success: true });
}
