import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { applySubscriptionActivation } from "@/lib/subscriptionActivation";
import { getReferralDiscountValue } from "@/lib/referralBenefits";

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  await requireAdminUser();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // جلب الطلب
  const activationRequest = await prisma.shamCashActivationRequest.findUnique({
    where: { id },
  });
  if (!activationRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (activationRequest.status === "ACTIVATED") {
    return NextResponse.json({ ok: true, alreadyActivated: true });
  }

  if (activationRequest.status === "REJECTED") {
    return NextResponse.json(
      {
        error: localizeErrorMessage(
          "This activation request was rejected and cannot be approved",
          isArabic,
        ),
      },
      { status: 409 },
    );
  }

  // تفعيل الحساب فعليًا
  try {
    const referralDiscountValue = await getReferralDiscountValue(
      prisma,
      activationRequest.userId,
      Number(activationRequest.amount),
    );

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          payerId: activationRequest.userId,
          amount: activationRequest.amount,
          currency: "USD",
          method: "SHAMCASH",
          status: "COMPLETED",
        },
      });

      // تحديث حالة الطلب
      await tx.shamCashActivationRequest.update({
        where: { id },
        data: {
          status: "ACTIVATED",
          checkedByWorker: true,
          isValid: true,
          adminNote: "Approved by admin and activated successfully.",
        },
      });
      // تفعيل اشتراك المستخدم
      await applySubscriptionActivation({
        tx,
        userId: activationRequest.userId,
        subscriptionAmount: Number(activationRequest.amount),
        sourceLabel: "ShamCash",
        referralDiscountValue,
      });
      // إشعار المستخدم
      await tx.notification.create({
        data: {
          userId: activationRequest.userId,
          title: "تم تفعيل حسابك",
          message: "تمت الموافقة على دفعتك عبر شام كاش وتم تفعيل حسابك بنجاح.",
          type: "INFO",
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Activation failed";
    const isRenewalWindowError =
      message === "Renewal is only allowed during the grace period";

    return NextResponse.json(
      {
        error: localizeErrorMessage(message, isArabic),
        details: String(error),
      },
      { status: isRenewalWindowError ? 409 : 500 },
    );
  }
}
