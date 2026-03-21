import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applySubscriptionActivation } from "@/lib/subscriptionActivation";
import { enforceRateLimit } from "@/lib/rateLimit";
import { authHelper } from "../../utils/authHelper";
import { Errors } from "../../lib/errors/errors";
import { handleApiError } from "../../lib/errors/errorHandler";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";

const REFERRAL_DISCOUNT_RATE = 0.1;

export async function PUT(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const session = await authHelper();
    const rateLimitResponse = await enforceRateLimit({
      req,
      key: "activate:put",
      userId: session?.id,
      limit: 20,
      windowMs: 60_000,
      errorMessage: t(
        "محاولات التفعيل كثيرة جدًا. يرجى الانتظار قليلًا.",
        "Too many activation attempts. Please wait a moment.",
      ),
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const user = await prisma.user.findUnique({
      where: { id: session?.id },
    });
    if (!user) throw Errors.UNAUTHORIZED();
    const { activationCode } = (await req.json()) as {
      activationCode: string;
    };

    if (!activationCode) {
      throw Errors.VALIDATION(
        t("رمز التفعيل مطلوب", "Activation code is required"),
      );
    }

    const code = await prisma.activationCode.findUnique({
      where: { code: activationCode, used: false },
    });

    if (!code) {
      throw Errors.NOT_FOUND(
        t(
          "رمز التفعيل غير موجود أو تم استخدامه مسبقًا",
          "Activation code not found or already used",
        ),
      );
    }

    const activeUntil = user.activeUntil ? new Date(user.activeUntil) : null;
    const isFirstActivation = !activeUntil;

    const referralLink = await prisma.referral.findFirst({
      where: { newUser: user.id },
      select: { userId: true },
    });

    const referralDiscountValue =
      isFirstActivation && referralLink?.userId
        ? Number(code.balance) * REFERRAL_DISCOUNT_RATE
        : 0;

    let newActiveUntil: Date;

    await prisma.$transaction(async (tx) => {
      const result = await applySubscriptionActivation({
        tx,
        userId: user.id,
        subscriptionAmount: Number(code.balance),
        sourceLabel: "كود التفعيل",
        referralDiscountValue,
      });

      newActiveUntil = result.newActiveUntil;

      await tx.activationCode.update({
        where: { code: activationCode },
        data: { used: true },
      });
    });

    return NextResponse.json({
      success: true,
      activeUntil: newActiveUntil!.toISOString(),
    });
  } catch (error) {
    console.error("Activation error:", error);
    return handleApiError(error, req);
  }
}
