import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getShamCashIncomingPaymentJobByPaymentId } from "@/lib/shamcashIncomingPaymentQueue";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

export async function GET(req: NextRequest) {
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
      key: "pay:shamcash:status:get",
      userId: session.user.id,
      limit: 120,
      windowMs: 60_000,
      errorMessage: t(
        "عدد كبير من محاولات التحقق، يرجى التمهل قليلاً",
        "Too many status checks. Please slow down.",
      ),
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const paymentId = String(
      req.nextUrl.searchParams.get("paymentId") || "",
    ).trim();
    if (!paymentId) {
      return NextResponse.json(
        { message: t("paymentId مطلوب", "paymentId is required") },
        { status: 400 },
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        payerId: session.user.id,
        method: "SHAMCASH",
      },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        createdAt: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { message: t("عملية الدفع غير موجودة", "Payment not found") },
        { status: 404 },
      );
    }

    let queueJob = null;
    try {
      queueJob = await getShamCashIncomingPaymentJobByPaymentId(paymentId);
    } catch {
      queueJob = null;
    }

    const queueStatus = queueJob?.status || "UNKNOWN";

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        createdAt: payment.createdAt.toISOString(),
      },
      queue: queueJob
        ? {
            status: queueStatus,
            attempts: queueJob.attempts,
            pendingPosition: queueJob.pendingPosition,
            transactionId: queueJob.transactionId,
            lastError: queueJob.lastError,
            updatedAt: queueJob.updatedAt,
          }
        : null,
      message:
        payment.status === "COMPLETED"
          ? t("تمت العملية بنجاح", "Payment completed successfully")
          : payment.status === "REFUNDED"
            ? t(
                "تمت إعادة الرصيد إلى محفظتك",
                "Amount was refunded to your balance",
              )
            : payment.status === "FAILED"
              ? t("تعذر التحقق من عملية الدفع", "Payment verification failed")
              : t("طلبك قيد المراجعة", "Your request is under review"),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Status check failed";
    return NextResponse.json(
      { message: localizeErrorMessage(message, isArabic) },
      { status: 500 },
    );
  }
}
