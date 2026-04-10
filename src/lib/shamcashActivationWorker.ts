import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyShamCashIncomingTransferInHistory } from "@/lib/shamcashHistoryVerify";
import { applySubscriptionActivation } from "@/lib/subscriptionActivation";
import { getReferralDiscountValue } from "@/lib/referralBenefits";

const DEFAULT_SUBSCRIPTION_AMOUNT = 30;

const toAmountNumber = (
  value: Prisma.Decimal | number | string | null | undefined,
) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
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

export const normalizeShamCashTransactionNumber = (value: string) => {
  const match = String(value || "")
    .trim()
    .match(/^#\s*([0-9]{4,})$/);

  return match ? `#${match[1]}` : "";
};

export const isValidShamCashTransactionNumber = (value: string) =>
  Boolean(normalizeShamCashTransactionNumber(value));

const getTransactionDigits = (value: string) =>
  normalizeShamCashTransactionNumber(value).replace(/^#/, "");

type ActivationWorkerTx = {
  user: {
    update: (args: Prisma.UserUpdateArgs) => Promise<unknown>;
  };
  notification: {
    create: (args: {
      data: {
        userId: string;
        title: string;
        message: string;
        type: NotificationType;
      };
    }) => Promise<unknown>;
  };
  shamCashActivationRequest: {
    update: (args: {
      where: { id: string };
      data: {
        status?:
          | "PENDING"
          | "VERIFIED"
          | "REJECTED"
          | "ADMIN_REVIEW"
          | "ACTIVATED";
        checkedByWorker: boolean;
        isValid: boolean;
        adminNote: string;
        amount?: number;
      };
    }) => Promise<unknown>;
  };
  payment: {
    create: (args: Prisma.PaymentCreateArgs) => Promise<unknown>;
  };
  chargingLog: {
    create: (args: Prisma.ChargingLogCreateArgs) => Promise<unknown>;
  };
  walletLedger: {
    create: (args: Prisma.WalletLedgerCreateArgs) => Promise<unknown>;
  };
};

const updateActivationRequest = async (input: {
  tx: ActivationWorkerTx;
  requestId: string;
  status: "VERIFIED" | "REJECTED" | "ADMIN_REVIEW" | "ACTIVATED";
  isValid: boolean;
  adminNote: string;
  amount?: number;
}) => {
  const { tx, requestId, status, isValid, adminNote, amount } = input;

  await tx.shamCashActivationRequest.update({
    where: { id: requestId },
    data: {
      status,
      checkedByWorker: true,
      isValid,
      adminNote,
      amount,
    },
  });
};

const createUserNotification = async (
  tx: ActivationWorkerTx,
  title: string,
  message: string,
  type: NotificationType,
  userId: string,
) => {
  await tx.notification.create({
    data: {
      userId,
      title,
      message,
      type,
    },
  });
};

const rejectRequestWithSupportNotice = async (input: {
  tx: ActivationWorkerTx;
  requestId: string;
  userId: string;
  amount?: number;
  title: string;
  message: string;
  adminNote: string;
}) => {
  await updateActivationRequest({
    tx: input.tx,
    requestId: input.requestId,
    status: "REJECTED",
    isValid: false,
    adminNote: input.adminNote,
    amount: input.amount,
  });

  await createUserNotification(
    input.tx,
    input.title,
    input.message,
    "WARNING",
    input.userId,
  );
};

const creditReadyBalance = async (input: {
  tx: ActivationWorkerTx;
  userId: string;
  amount: number;
  referenceId: string;
  logType: string;
}) => {
  const amount = toAmountNumber(input.amount);
  if (amount <= 0) {
    return;
  }

  await input.tx.user.update({
    where: { id: input.userId },
    data: {
      balance: { increment: amount },
    },
  });

  await input.tx.walletLedger.create({
    data: {
      userId: input.userId,
      amount,
      type: "CREDIT",
      referenceId: input.referenceId,
    },
  });

  await input.tx.chargingLog.create({
    data: {
      userId: input.userId,
      type: input.logType,
      amount,
    },
  });
};

export const getRequiredShamCashActivationAmount = async () => {
  const settings = await prisma.appPaymentSettings.findUnique({
    where: { id: 1 },
    select: { subscriptionMonthlyPrice: true },
  });

  return toAmountNumber(
    settings?.subscriptionMonthlyPrice ?? DEFAULT_SUBSCRIPTION_AMOUNT,
  );
};

export const processShamCashActivationRequest = async (requestId: string) => {
  const request = await prisma.shamCashActivationRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
          activeUntil: true,
        },
      },
    },
  });

  if (!request || request.status !== "PENDING") {
    return false;
  }

  const txNumber = normalizeShamCashTransactionNumber(request.txNumber);
  const requiredAmount = toAmountNumber(request.amount);

  if (!txNumber) {
    await prisma.$transaction(async (tx) => {
      await rejectRequestWithSupportNotice({
        tx,
        requestId: request.id,
        userId: request.userId,
        title: "رقم عملية غير صالح",
        message:
          "رقم العملية يجب أن يبدأ بالرمز # مثل #123456. أعد الإرسال بالصيغة الصحيحة.",
        adminNote:
          "رقم العملية غير صالح. يجب أن يبدأ بالرمز # ويتضمن أرقاماً فقط.",
      });
    });

    return true;
  }

  const verification = await verifyShamCashIncomingTransferInHistory({
    amount: requiredAmount,
    expectedTransactionId: getTransactionDigits(txNumber),
    expectedEmail: request.user.email || undefined,
    expectedNote: request.user.email || undefined,
    requestedAt: request.createdAt,
  });

  if (!verification?.matched) {
    await prisma.$transaction(async (tx) => {
      await rejectRequestWithSupportNotice({
        tx,
        requestId: request.id,
        userId: request.userId,
        amount: requiredAmount,
        title: "تعذر التحقق من عملية ShamCash",
        message:
          "لم يتمكن الوركر من العثور على رقم العملية في سجل شام كاش. إذا كنت متأكدًا من الدفع، يرجى التواصل مع مركز الدعم لتأكيد العملية.",
        adminNote:
          "الوركر لم يجد رقم العملية في السجل. طُلب من المستخدم التواصل مع مركز الدعم لتأكيد الدفع.",
      });
    });

    return true;
  }

  const foundAmount = extractTransferredAmount(verification.rawText || "");

  if (foundAmount === null) {
    await prisma.$transaction(async (tx) => {
      await rejectRequestWithSupportNotice({
        tx,
        requestId: request.id,
        userId: request.userId,
        amount: requiredAmount,
        title: "تعذر قراءة مبلغ عملية ShamCash",
        message:
          "تم العثور على رقم العملية لكن لم يتمكن الوركر من قراءة قيمة المبلغ. يرجى التواصل مع مركز الدعم لتأكيد الدفع.",
        adminNote: `تم العثور على العملية ${txNumber} لكن تعذر استخراج مبلغها تلقائياً من السجل.`,
      });
    });

    return true;
  }

  const actualAmount = toAmountNumber(foundAmount);

  if (actualAmount < requiredAmount) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          payerId: request.userId,
          amount: actualAmount,
          currency: "USD",
          method: "SHAMCASH",
          status: "COMPLETED",
        },
      });

      await creditReadyBalance({
        tx,
        userId: request.userId,
        amount: actualAmount,
        referenceId: request.id,
        logType: "SHAMCASH_ACTIVATION_UNDERPAID_CREDIT",
      });

      await updateActivationRequest({
        tx,
        requestId: request.id,
        status: "VERIFIED",
        isValid: true,
        amount: actualAmount,
        adminNote: `تم العثور على العملية ${txNumber} بمبلغ ${actualAmount.toFixed(2)} USD وهو أقل من قيمة الاشتراك المطلوبة ${requiredAmount.toFixed(2)} USD، لذلك تم تحويل المبلغ إلى رصيد المستخدم الجاهز للسحب دون تفعيل الاشتراك.`,
      });

      await createUserNotification(
        tx,
        "المبلغ غير كاف لإتمام التفعيل",
        `تم العثور على العملية ${txNumber} لكن المبلغ المدفوع (${actualAmount.toFixed(2)} USD) غير كاف لإتمام التفعيل. تمت إضافة المبلغ إلى رصيدك الجاهز للسحب ويمكنك استعادته من رصيد حسابك.`,
        "WARNING",
        request.userId,
      );
    });

    return true;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const freshRequest = await tx.shamCashActivationRequest.findUnique({
        where: { id: request.id },
        select: {
          id: true,
          userId: true,
          status: true,
        },
      });

      if (!freshRequest || freshRequest.status !== "PENDING") {
        return;
      }

      await tx.payment.create({
        data: {
          payerId: request.userId,
          amount: actualAmount,
          currency: "USD",
          method: "SHAMCASH",
          status: "COMPLETED",
        },
      });

      const referralDiscountValue = await getReferralDiscountValue(
        tx,
        request.userId,
        requiredAmount,
      );

      await applySubscriptionActivation({
        tx,
        userId: request.userId,
        subscriptionAmount: requiredAmount,
        sourceLabel: "ShamCash worker verification",
        referralDiscountValue,
      });

      const excessAmount = toAmountNumber(actualAmount - requiredAmount);
      if (excessAmount > 0) {
        await creditReadyBalance({
          tx,
          userId: request.userId,
          amount: excessAmount,
          referenceId: request.id,
          logType: "SHAMCASH_ACTIVATION_OVERPAID_CREDIT",
        });
      }

      await updateActivationRequest({
        tx,
        requestId: request.id,
        status: "ACTIVATED",
        isValid: true,
        amount: actualAmount,
        adminNote:
          excessAmount > 0
            ? `تم التحقق من العملية ${txNumber} وتفعيل الاشتراك تلقائياً. المبلغ الزائد (${excessAmount.toFixed(2)} USD) حُوِّل إلى رصيد المستخدم الجاهز للسحب.`
            : `تم التحقق من العملية ${txNumber} وتفعيل الاشتراك تلقائياً عبر الوركر.`,
      });

      await createUserNotification(
        tx,
        "تم تفعيل الحساب عبر ShamCash",
        excessAmount > 0
          ? `تم التحقق من العملية ${txNumber} وتفعيل حسابك بنجاح. كما تمت إضافة الزيادة (${excessAmount.toFixed(2)} USD) إلى رصيدك الجاهز للسحب.`
          : `تم التحقق من العملية ${txNumber} وتفعيل حسابك بنجاح.`,
        "INFO",
        request.userId,
      );
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "تعذر إتمام التفعيل بعد التحقق من العملية";

    await prisma.$transaction(async (tx) => {
      await updateActivationRequest({
        tx,
        requestId: request.id,
        status: "ADMIN_REVIEW",
        isValid: true,
        amount: actualAmount,
        adminNote: `تم العثور على العملية ${txNumber} لكن فشل إتمام التفعيل تلقائياً: ${message}`,
      });

      await createUserNotification(
        tx,
        "تم العثور على العملية لكن يلزم تأكيد يدوي",
        "تمكن الوركر من العثور على العملية والتحقق منها، لكن حدث خلل أثناء إتمام التفعيل تلقائياً. يرجى التواصل مع مركز الدعم لمراجعة الحالة.",
        "WARNING",
        request.userId,
      );
    });

    return true;
  }

  return true;
};

export const processNextPendingShamCashActivationRequest = async () => {
  const pendingRequest = await prisma.shamCashActivationRequest.findFirst({
    where: {
      status: "PENDING",
      checkedByWorker: false,
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!pendingRequest) {
    return false;
  }

  await processShamCashActivationRequest(pendingRequest.id);
  return true;
};
