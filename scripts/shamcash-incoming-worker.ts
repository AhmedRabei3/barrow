import { loadEnvConfig } from "@next/env";
import { ItemType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import {
  claimNextShamCashIncomingPaymentJob,
  markShamCashIncomingPaymentJobCompleted,
  markShamCashIncomingPaymentJobFailed,
} from "../src/lib/shamcashIncomingPaymentQueue";
import { verifyShamCashIncomingTransferInHistory } from "../src/lib/shamcashHistoryVerify";
import { applySubscriptionActivation } from "../src/lib/subscriptionActivation";
import { applyFeaturedAdActivation } from "../src/lib/featuredAds";

loadEnvConfig(process.cwd());

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const POLL_INTERVAL_MS = parsePositiveInt(
  process.env.SHAMCASH_INCOMING_WORKER_POLL_MS,
  2500,
);
const MAX_ATTEMPTS = parsePositiveInt(
  process.env.SHAMCASH_INCOMING_MAX_ATTEMPTS,
  8,
);

const processOneJob = async () => {
  const job = await claimNextShamCashIncomingPaymentJob();
  if (!job) {
    return false;
  }

  let matchedTransfer = false;

  try {
    const payment = await prisma.payment.findFirst({
      where: {
        id: job.paymentId,
        payerId: job.userId,
      },
      select: {
        id: true,
        amount: true,
        status: true,
      },
    });

    if (!payment) {
      await markShamCashIncomingPaymentJobFailed({
        jobId: job.id,
        errorMessage: "Payment not found",
        attempts: job.attempts,
        maxAttempts: job.attempts,
      });
      return true;
    }

    if (payment.status !== "HOLD") {
      await markShamCashIncomingPaymentJobCompleted(job.id, "ALREADY_HANDLED");
      return true;
    }

    const verification = await verifyShamCashIncomingTransferInHistory({
      amount: Number(payment.amount),
      expectedEmail: job.expectedEmail,
      expectedNote: job.expectedNote,
      requestedAt: new Date(job.requestedAt),
    });

    if (!verification?.matched) {
      throw new Error(
        "No matching ShamCash incoming transfer found yet for this request.",
      );
    }

    matchedTransfer = true;

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: job.paymentId },
        data: { status: "COMPLETED" },
      });

      if (job.type === "FEATURED_AD") {
        if (!job.itemId || !job.itemType) {
          throw new Error("FEATURED_AD payment is missing item data");
        }

        await applyFeaturedAdActivation({
          tx,
          userId: job.userId,
          itemId: job.itemId,
          itemType: job.itemType as ItemType,
          sourceLabel: "ShamCash",
        });
      } else {
        await applySubscriptionActivation({
          tx,
          userId: job.userId,
          subscriptionAmount: Number(payment.amount),
          sourceLabel: "ShamCash",
        });

        if (job.referralDiscountApplied) {
          const original = Number(job.originalAmount || payment.amount || 0);
          const discounted = Number(payment.amount || 0);
          const savedAmount = Number((original - discounted).toFixed(2));

          if (savedAmount > 0) {
            await tx.notification.create({
              data: {
                userId: job.userId,
                title: "🎁 تم تطبيق خصم الإحالة",
                message: `تم تطبيق خصم إحالة 10% على اشتراكك (وفرت ${savedAmount}$). شكرًا لاستخدام رابط الدعوة!`,
              },
            });
          }
        }
      }
    });

    await markShamCashIncomingPaymentJobCompleted(
      job.id,
      verification.transactionId || "INCOMING_VERIFIED",
    );

    console.log(`ShamCash incoming payment completed: ${job.id}`);
    return true;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ShamCash incoming worker failed during execution";

    const { willRetry } = await markShamCashIncomingPaymentJobFailed({
      jobId: job.id,
      errorMessage: message,
      attempts: job.attempts,
      maxAttempts: MAX_ATTEMPTS,
    });

    if (!willRetry) {
      if (matchedTransfer) {
        await prisma.$transaction(async (tx) => {
          const pendingPayment = await tx.payment.findFirst({
            where: {
              id: job.paymentId,
              payerId: job.userId,
              status: "HOLD",
            },
            select: {
              id: true,
              amount: true,
              currency: true,
            },
          });

          if (!pendingPayment) {
            return;
          }

          await tx.payment.update({
            where: { id: pendingPayment.id },
            data: { status: "REFUNDED" },
          });

          await tx.user.update({
            where: { id: job.userId },
            data: {
              balance: {
                increment: Number(pendingPayment.amount),
              },
            },
          });

          await tx.notification.create({
            data: {
              userId: job.userId,
              title: "⚠️ تعذر إتمام التفعيل وتمت إعادة الرصيد",
              message: `تم التحقق من تحويل ShamCash لكن تعذر إتمام التفعيل، لذلك تمت إضافة ${Number(pendingPayment.amount).toFixed(2)} ${pendingPayment.currency} إلى رصيدك داخل المنصة.`,
            },
          });
        });
      } else {
        await prisma.$transaction(async (tx) => {
          const pendingPayment = await tx.payment.findFirst({
            where: {
              id: job.paymentId,
              payerId: job.userId,
              status: "HOLD",
            },
            select: {
              id: true,
            },
          });

          if (!pendingPayment) {
            return;
          }

          await tx.payment.update({
            where: { id: pendingPayment.id },
            data: { status: "FAILED" },
          });

          await tx.notification.create({
            data: {
              userId: job.userId,
              title: "⚠️ تعذر التحقق من عملية ShamCash",
              message:
                "لم نتمكن من العثور على تحويل مطابق بعد عدة محاولات. تحقق من كتابة بريد حسابك في الملاحظة وقيمة التحويل، ثم أعد المحاولة من صفحة الدفع.",
            },
          });
        });
      }
    }

    console.error(
      `ShamCash incoming worker failed: ${job.id}. Retry: ${willRetry}. Error: ${message}`,
    );

    return true;
  }
};

const runWorker = async () => {
  if (!String(process.env.REDIS_URL || "").trim()) {
    throw new Error(
      "REDIS_URL is required for the ShamCash incoming payment queue worker.",
    );
  }

  console.log("ShamCash incoming payment worker started");
  console.log(`Poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`Max attempts: ${MAX_ATTEMPTS}`);

  while (true) {
    try {
      const handled = await processOneJob();
      if (!handled) {
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error) {
      console.error("Incoming worker loop error:", error);
      await sleep(POLL_INTERVAL_MS);
    }
  }
};

runWorker().catch((error) => {
  console.error("Failed to start ShamCash incoming payment worker:", error);
  process.exit(1);
});
