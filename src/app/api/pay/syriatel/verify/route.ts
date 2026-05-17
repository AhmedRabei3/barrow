import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import {
  isValidSyriatelReferenceNumber,
  normalizeSyriatelReferenceNumber,
  verifySyriatelCashPayment,
} from "@/lib/syriatelCash";
import { applySubscriptionActivation } from "@/lib/subscriptionActivation";
import { getReferralDiscountValue } from "@/lib/referralBenefits";

const toAmount = (
  value: Prisma.Decimal | number | string | null | undefined,
) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
};

const getRequiredSubscriptionAmount = async () => {
  const settings = await prisma.appPaymentSettings.findUnique({
    where: { id: 1 },
    select: { subscriptionMonthlyPrice: true },
  });

  return toAmount(settings?.subscriptionMonthlyPrice ?? 30);
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
      key: "pay:syriatel:verify:post",
      userId: session.user.id,
      limit: 30,
      windowMs: 60_000,
      errorMessage: t(
        "عدد كبير من محاولات التحقق، يرجى الانتظار قليلاً",
        "Too many verification attempts. Please wait a bit.",
      ),
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = (await req.json()) as { referenceNumber?: string };
    const referenceNumber = normalizeSyriatelReferenceNumber(
      body?.referenceNumber || "",
    );

    if (!isValidSyriatelReferenceNumber(referenceNumber)) {
      return NextResponse.json(
        {
          ok: false,
          message: t(
            "رقم المرجع غير صالح. استخدم أحرفاً أو أرقاماً بطول لا يقل عن 4 خانات.",
            "Invalid reference number. Use at least 4 letters or digits.",
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
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          message: t("المستخدم غير موجود", "User not found"),
        },
        { status: 404 },
      );
    }

    const requiredAmount = await getRequiredSubscriptionAmount();

    const verification = await verifySyriatelCashPayment({
      referenceNumber,
      expectedAmount: requiredAmount,
      currency: "USD",
      userId: user.id,
      email: user.email || undefined,
    });

    if (!verification.verified) {
      return NextResponse.json(
        {
          ok: false,
          message:
            verification.providerMessage ||
            t(
              "تعذر التحقق من دفعة سيريتل كاش. تأكد من الرقم ثم أعد المحاولة.",
              "Could not verify Syriatel Cash payment. Check the reference and retry.",
            ),
          providerStatusCode: verification.providerStatusCode,
        },
        { status: 400 },
      );
    }

    const actualAmount = toAmount(verification.actualAmount ?? requiredAmount);

    if (actualAmount < requiredAmount) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            payerId: user.id,
            amount: actualAmount,
            currency: "USD",
            method: "BANK_TRANSFER",
            status: "COMPLETED",
          },
        });

        if (actualAmount > 0) {
          await tx.user.update({
            where: { id: user.id },
            data: { balance: { increment: actualAmount } },
          });

          await tx.walletLedger.create({
            data: {
              userId: user.id,
              amount: actualAmount,
              type: "CREDIT",
              referenceId: verification.transactionId || referenceNumber,
            },
          });

          await tx.chargingLog.create({
            data: {
              userId: user.id,
              type: "SYRIATEL_ACTIVATION_UNDERPAID_CREDIT",
              amount: actualAmount,
            },
          });
        }

        await tx.notification.create({
          data: {
            userId: user.id,
            title: t(
              "المبلغ غير كافٍ للتفعيل",
              "Amount is not enough for activation",
            ),
            message: t(
              `تم التحقق من العملية لكن المبلغ (${actualAmount.toFixed(2)} USD) أقل من المطلوب (${requiredAmount.toFixed(2)} USD). تمت إضافة المبلغ إلى رصيدك الجاهز للسحب.`,
              `Payment was verified but amount (${actualAmount.toFixed(2)} USD) is less than required (${requiredAmount.toFixed(2)} USD). The amount was credited to your ready balance.`,
            ),
            type: "WARNING",
          },
        });
      });

      return NextResponse.json({
        ok: true,
        activated: false,
        pending: false,
        underpaid: true,
        amount: actualAmount,
        requiredAmount,
        message: t(
          "تم التحقق من الدفع لكن المبلغ غير كافٍ للتفعيل، وتم تحويله إلى رصيدك.",
          "Payment verified but amount is insufficient for activation and was moved to your balance.",
        ),
      });
    }

    const activationResult = await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          payerId: user.id,
          amount: actualAmount,
          currency: "USD",
          method: "BANK_TRANSFER",
          status: "COMPLETED",
        },
      });

      try {
        const referralDiscountValue = await getReferralDiscountValue(
          tx,
          user.id,
          requiredAmount,
        );

        await applySubscriptionActivation({
          tx,
          userId: user.id,
          subscriptionAmount: requiredAmount,
          sourceLabel: "Syriatel Cash API verification",
          referralDiscountValue,
          activatingUserName: user.name || undefined,
        });

        const excessAmount = toAmount(actualAmount - requiredAmount);
        if (excessAmount > 0) {
          await tx.user.update({
            where: { id: user.id },
            data: { balance: { increment: excessAmount } },
          });

          await tx.walletLedger.create({
            data: {
              userId: user.id,
              amount: excessAmount,
              type: "CREDIT",
              referenceId: verification.transactionId || referenceNumber,
            },
          });

          await tx.chargingLog.create({
            data: {
              userId: user.id,
              type: "SYRIATEL_ACTIVATION_OVERPAID_CREDIT",
              amount: excessAmount,
            },
          });
        }

        await tx.notification.create({
          data: {
            userId: user.id,
            title: t(
              "تم تفعيل الحساب عبر سيريتل كاش",
              "Account activated via Syriatel Cash",
            ),
            message:
              excessAmount > 0
                ? t(
                    `تم تفعيل حسابك بنجاح وتم إضافة الزيادة (${excessAmount.toFixed(2)} USD) إلى رصيدك.`,
                    `Your account is now active. Extra amount (${excessAmount.toFixed(2)} USD) was added to your balance.`,
                  )
                : t(
                    "تم تفعيل حسابك بنجاح بعد تأكيد دفعة سيريتل كاش.",
                    "Your account is now active after Syriatel Cash verification.",
                  ),
            type: "INFO",
          },
        });

        return {
          activated: true,
          excessAmount,
          message: t(
            "تم تفعيل الحساب بنجاح عبر سيريتل كاش",
            "Account activated successfully via Syriatel Cash",
          ),
        };
      } catch (activationError) {
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: actualAmount } },
        });

        await tx.walletLedger.create({
          data: {
            userId: user.id,
            amount: actualAmount,
            type: "CREDIT",
            referenceId: verification.transactionId || referenceNumber,
          },
        });

        await tx.chargingLog.create({
          data: {
            userId: user.id,
            type: "SYRIATEL_ACTIVATION_FALLBACK_CREDIT",
            amount: actualAmount,
          },
        });

        const fallbackMessage =
          activationError instanceof Error
            ? activationError.message
            : "Activation fallback credit";

        await tx.notification.create({
          data: {
            userId: user.id,
            title: t(
              "تم التحقق من الدفع لكن يلزم إكمال التفعيل يدوياً",
              "Payment verified but activation needs manual follow-up",
            ),
            message: t(
              `تم تأكيد دفعة سيريتل كاش لكن تعذر إتمام التفعيل تلقائياً (${fallbackMessage}). تمت إضافة المبلغ إلى رصيدك وسيتم التواصل معك عند إكمال المراجعة.`,
              `Syriatel payment was confirmed but automatic activation failed (${fallbackMessage}). Amount was credited to your balance and support will follow up.`,
            ),
            type: "WARNING",
          },
        });

        return {
          activated: false,
          excessAmount: 0,
          message: t(
            "تم تأكيد الدفع وإيداعه في رصيدك، وسيتم إكمال التفعيل بعد المراجعة.",
            "Payment confirmed and credited to your balance. Activation will be completed after review.",
          ),
        };
      }
    });

    return NextResponse.json({
      ok: true,
      activated: activationResult.activated,
      pending: !activationResult.activated,
      message: activationResult.message,
      amount: actualAmount,
      requiredAmount,
      transactionId: verification.transactionId || null,
      providerStatusCode: verification.providerStatusCode,
    });
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "Failed to verify Syriatel Cash";
    return NextResponse.json(
      {
        ok: false,
        message: localizeErrorMessage(rawMessage, isArabic),
      },
      { status: 500 },
    );
  }
}
