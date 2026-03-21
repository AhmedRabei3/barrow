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

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: t("غير مصرح", "Unauthorized") },
      { status: 401 },
    );
  }

  const rateLimitResponse = await enforceRateLimit({
    req,
    key: "pay:fatora:confirm:post",
    userId: session.user.id,
    limit: 60,
    windowMs: 60_000,
    errorMessage: t(
      "عدد كبير من محاولات التحقق، يرجى التمهل قليلًا",
      "Too many confirmation checks. Please slow down.",
    ),
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { paymentId } = (await req.json()) as { paymentId?: string };
  if (!paymentId) {
    return NextResponse.json(
      { message: localizeErrorMessage("paymentId is required", isArabic) },
      { status: 400 },
    );
  }

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      payerId: session.user.id,
    },
    select: {
      id: true,
      status: true,
      method: true,
      amount: true,
      createdAt: true,
    },
  });

  if (!payment) {
    return NextResponse.json(
      { message: localizeErrorMessage("Payment not found", isArabic) },
      { status: 404 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      activeUntil: true,
      isActive: true,
    },
  });

  return NextResponse.json({
    success: payment.status === "COMPLETED",
    payment,
    user,
  });
}
