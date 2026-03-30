import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyShamCashIncomingTransferInHistory } from "@/lib/shamcashHistoryVerify";
import { authHelper } from "@/app/api/utils/authHelper";
import { applySubscriptionActivation } from "@/lib/subscriptionActivation";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { getReferralDiscountValue } from "@/lib/referralBenefits";

const DEFAULT_SUBSCRIPTION_AMOUNT = 30;

type AdminNotificationClient = {
  user: {
    findMany: (args: {
      where: { isAdmin: boolean; isDeleted: boolean };
      select: { id: true };
    }) => Promise<Array<{ id: string }>>;
  };
  notification: {
    createMany: (args: {
      data: Array<{
        userId: string;
        title: string;
        message: string;
        type: "INFO" | "WARNING" | "ERROR";
      }>;
    }) => Promise<unknown>;
  };
};

const extractTransferredAmount = (rawText: string) => {
  const matches = [
    ...rawText.matchAll(/(?:USD|\$)\s*([0-9]+(?:[\.,][0-9]+)?)/gi),
    ...rawText.matchAll(/([0-9]+(?:[\.,][0-9]+)?)\s*(?:USD|\$)/gi),
  ];

  const amounts = matches
    .map((match) => Number(String(match[1] || "").replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!amounts.length) {
    return null;
  }

  return Number(Math.max(...amounts).toFixed(2));
};

const createAdminNotifications = async (
  tx: AdminNotificationClient,
  title: string,
  message: string,
  type: "INFO" | "WARNING" | "ERROR",
) => {
  const admins = await tx.user.findMany({
    where: {
      isAdmin: true,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (!admins.length) {
    return;
  }

  await tx.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title,
      message,
      type,
    })),
  });
};

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const user = await authHelper();
    const body = (await req.json()) as { txNumber?: string };
    const txNumber = String(body?.txNumber || "").trim();
    const userEmail = typeof user.email === "string" ? user.email : "";

    if (!txNumber) {
      return NextResponse.json(
        {
          ok: false,
          message: t("رقم العملية مطلوب", "Transaction number is required"),
        },
        { status: 400 },
      );
    }

    const settings = await prisma.appPaymentSettings.findUnique({
      where: { id: 1 },
      select: { subscriptionMonthlyPrice: true },
    });
    const requiredAmount = Number(
      settings?.subscriptionMonthlyPrice ?? DEFAULT_SUBSCRIPTION_AMOUNT,
    );

    const existing = await prisma.shamCashActivationRequest.findFirst({
      where: { txNumber },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: t("رقم عملية مستخدم", "Transaction number already used"),
          message: t(
            "رقم العملية الذي أدخلته مستخدم سابقاً. يرجى التأكد من الرقم والمحاولة مجدداً.",
            "The transaction number you entered has already been used. Please check it and try again.",
          ),
          type: "WARNING",
        },
      });
      return NextResponse.json(
        {
          ok: false,
          message: t(
            "تم استخدام هذا الرقم مسبقاً",
            "This transaction number has already been used",
          ),
        },
        { status: 409 },
      );
    }

    const workerResult = await verifyShamCashIncomingTransferInHistory({
      amount: requiredAmount,
      expectedTransactionId: txNumber,
      expectedEmail: userEmail || undefined,
      expectedNote: userEmail || undefined,
      requestedAt: new Date(),
    });

    if (!workerResult) {
      await prisma.$transaction(async (tx) => {
        await tx.shamCashActivationRequest.create({
          data: {
            userId: user.id,
            txNumber,
            amount: requiredAmount,
            status: "ADMIN_REVIEW",
            checkedByWorker: true,
            isValid: false,
            adminNote: t(
              "لم يعثر الوركر على العملية تلقائياً. يحتاج الطلب إلى مراجعة أدمن.",
              "The worker could not find this transaction automatically. Admin review is required.",
            ),
          },
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            title: t("الطلب قيد المراجعة", "Request under review"),
            message: t(
              "تعذر التحقق من العملية تلقائياً، لذلك تم تحويل طلبك إلى مراجعة الأدمن. سيتم إشعارك بالنتيجة.",
              "The transaction could not be verified automatically, so your request was sent for admin review. You will be notified with the result.",
            ),
            type: "WARNING",
          },
        });

        await createAdminNotifications(
          tx,
          t(
            "طلب تفعيل شام كاش يحتاج مراجعة",
            "ShamCash activation needs review",
          ),
          t(
            `تعذر التحقق تلقائياً من طلب المستخدم ${userEmail || user.id} برقم العملية ${txNumber}.`,
            `Automatic verification failed for user ${userEmail || user.id} with transaction ${txNumber}.`,
          ),
          "WARNING",
        );
      });

      return NextResponse.json({
        ok: true,
        adminReview: true,
        message: t(
          "تعذر التحقق من العملية تلقائياً. تم تحويل الطلب إلى مراجعة الأدمن.",
          "The transaction could not be verified automatically. The request was sent for admin review.",
        ),
      });
    }

    const foundAmount = extractTransferredAmount(workerResult.rawText || "");

    if (foundAmount === null) {
      await prisma.$transaction(async (tx) => {
        await tx.shamCashActivationRequest.create({
          data: {
            userId: user.id,
            txNumber,
            amount: requiredAmount,
            status: "ADMIN_REVIEW",
            checkedByWorker: true,
            isValid: false,
            adminNote: t(
              "تم العثور على العملية لكن تعذر تحديد قيمة المبلغ تلقائياً.",
              "The transaction was found but the transferred amount could not be determined automatically.",
            ),
          },
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            title: t("الطلب قيد المراجعة", "Request under review"),
            message: t(
              "تم العثور على العملية لكن تعذر تحديد المبلغ تلقائياً. تم تحويل الطلب إلى مراجعة الأدمن.",
              "The transaction was found, but the amount could not be determined automatically. Your request was sent for admin review.",
            ),
            type: "WARNING",
          },
        });

        await createAdminNotifications(
          tx,
          t("مراجعة يدوية لمبلغ شام كاش", "Manual ShamCash amount review"),
          t(
            `تم العثور على عملية للمستخدم ${userEmail || user.id} برقم ${txNumber} لكن قيمة المبلغ غير واضحة تلقائياً.`,
            `A transaction for user ${userEmail || user.id} with number ${txNumber} was found, but its amount could not be determined automatically.`,
          ),
          "WARNING",
        );
      });

      return NextResponse.json({
        ok: true,
        adminReview: true,
        message: t(
          "تم العثور على العملية لكن يجب على الأدمن مراجعة المبلغ يدوياً.",
          "The transaction was found, but an admin must review the amount manually.",
        ),
      });
    }

    if (foundAmount < requiredAmount) {
      const remaining = Number((requiredAmount - foundAmount).toFixed(2));

      await prisma.$transaction(async (tx) => {
        const activationRequest = await tx.shamCashActivationRequest.create({
          data: {
            userId: user.id,
            txNumber,
            amount: foundAmount,
            status: "ADMIN_REVIEW",
            checkedByWorker: true,
            isValid: false,
            adminNote: t(
              `المبلغ المدفوع أقل من المطلوب. تم تحويل ${foundAmount.toFixed(2)} USD إلى رصيد المستخدم، والمتبقي ${remaining.toFixed(2)} USD يحتاج قرار الأدمن.`,
              `The transferred amount is below the required price. ${foundAmount.toFixed(2)} USD was credited to the user's balance and the remaining ${remaining.toFixed(2)} USD requires admin review.`,
            ),
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: {
              increment: foundAmount,
            },
          },
        });

        await tx.walletLedger.create({
          data: {
            userId: user.id,
            amount: foundAmount,
            type: "CREDIT",
            referenceId: activationRequest.id,
          },
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            title: t("الطلب قيد المراجعة", "Request under review"),
            message: t(
              `المبلغ المدفوع (${foundAmount.toFixed(2)} USD) أقل من المطلوب (${requiredAmount.toFixed(2)} USD). تمت إضافة المبلغ المدفوع إلى رصيدك، وتم تحويل طلبك إلى مراجعة الأدمن لاتخاذ القرار المناسب.`,
              `The transferred amount (${foundAmount.toFixed(2)} USD) is below the required subscription price (${requiredAmount.toFixed(2)} USD). The paid amount was added to your balance, and your request was sent for admin review.`,
            ),
            type: "WARNING",
          },
        });

        await createAdminNotifications(
          tx,
          t("دفعة شام كاش ناقصة", "Underpaid ShamCash activation"),
          t(
            `المستخدم ${userEmail || user.id} دفع ${foundAmount.toFixed(2)} USD فقط من أصل ${requiredAmount.toFixed(2)} USD. تم تحويل المبلغ إلى رصيده، والطلب بانتظار المراجعة. رقم العملية: ${txNumber}.`,
            `User ${userEmail || user.id} paid only ${foundAmount.toFixed(2)} USD out of ${requiredAmount.toFixed(2)} USD. The amount was credited to the user balance and the request is awaiting review. Transaction: ${txNumber}.`,
          ),
          "WARNING",
        );
      });

      return NextResponse.json({
        ok: true,
        adminReview: true,
        notEnough: true,
        foundAmount,
        remaining,
        message: t(
          `المبلغ المدفوع أقل من المطلوب. تمت إضافة ${foundAmount.toFixed(2)} USD إلى رصيدك، وتم تحويل الطلب إلى مراجعة الأدمن.`,
          `The paid amount is below the required price. ${foundAmount.toFixed(2)} USD was added to your balance and the request was sent for admin review.`,
        ),
      });
    }

    const activationResult = await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          payerId: user.id,
          amount: requiredAmount,
          currency: "USD",
          method: "SHAMCASH",
          status: "COMPLETED",
        },
      });

      const referralDiscountValue = await getReferralDiscountValue(
        tx,
        user.id,
        requiredAmount,
      );

      const subscription = await applySubscriptionActivation({
        tx,
        userId: user.id,
        subscriptionAmount: requiredAmount,
        sourceLabel: "ShamCash manual verification",
        referralDiscountValue,
      });

      await tx.shamCashActivationRequest.create({
        data: {
          userId: user.id,
          txNumber,
          amount: requiredAmount,
          status: "ACTIVATED",
          checkedByWorker: true,
          isValid: true,
          adminNote: t(
            "تم التحقق من العملية وتفعيل الاشتراك تلقائياً.",
            "The transaction was verified and the subscription was activated automatically.",
          ),
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          title: t("تم تفعيل الحساب", "Account activated"),
          message: t(
            `تم التحقق من دفعتك عبر شام كاش وتفعيل حسابك حتى ${subscription.newActiveUntil.toLocaleDateString(isArabic ? "ar" : "en")}.`,
            `Your ShamCash payment was verified and your account is active until ${subscription.newActiveUntil.toLocaleDateString(isArabic ? "ar" : "en")}.`,
          ),
          type: "INFO",
        },
      });

      return subscription;
    });

    return NextResponse.json({
      ok: true,
      activated: true,
      message: t(
        "تم التحقق من العملية وتفعيل الحساب بنجاح",
        "The transaction was verified and the account was activated successfully",
      ),
      activeUntil: activationResult.newActiveUntil.toISOString(),
    });
  } catch (error) {
    console.error("Error verifying ShamCash payment:", error);

    const message =
      error instanceof Error
        ? localizeErrorMessage(error.message, isArabic)
        : t("خطأ غير متوقع", "Unexpected error occurred");

    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
