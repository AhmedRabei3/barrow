import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import { applySubscriptionActivation } from "@/lib/subscriptionActivation";
import { getReferralDiscountValue } from "@/lib/referralBenefits";

export async function POST(req: NextRequest) {
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

  // تفعيل الحساب فعليًا
  try {
    const referralDiscountValue = await getReferralDiscountValue(
      prisma,
      activationRequest.userId,
      Number(activationRequest.amount),
    );

    await prisma.$transaction(async (tx) => {
      // تحديث حالة الطلب
      await tx.shamCashActivationRequest.update({
        where: { id },
        data: { status: "ACTIVATED" },
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
    return NextResponse.json(
      { error: "Activation failed", details: String(error) },
      { status: 500 },
    );
  }
}
