import { loadEnvConfig } from "@next/env";
import { prisma } from "../src/lib/prisma";
import {
  claimNextShamCashPayoutJob,
  markShamCashPayoutJobCompleted,
  markShamCashPayoutJobFailed,
} from "../src/lib/shamcashPayoutQueue";
import { runShamCashPlaywrightPayout } from "../src/lib/shamcashPlaywrightPayout";

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
  process.env.SHAMCASH_PAYOUT_WORKER_POLL_MS,
  2500,
);
const MAX_ATTEMPTS = parsePositiveInt(
  process.env.SHAMCASH_PAYOUT_MAX_ATTEMPTS,
  3,
);

const processOneJob = async () => {
  const job = await claimNextShamCashPayoutJob();
  if (!job) {
    return false;
  }

  try {
    const result = await runShamCashPlaywrightPayout({
      walletCode: job.walletCode,
      amount: job.amount,
      note: job.note,
      reference: `MASHHOOR-${job.userId.slice(0, 8)}-${Date.now()}`,
      currency: job.currency,
    });

    await prisma.$transaction(async (tx) => {
      await tx.chargingLog.create({
        data: {
          userId: job.userId,
          type: "SHAMCASH_PLAYWRIGHT_WITHDRAWAL",
          amount: -Math.abs(job.amount),
        },
      });

      await tx.notification.create({
        data: {
          userId: job.userId,
          title: "✅ Withdrawal completed successfully",
          message: `Your withdrawal was completed successfully (${job.amount.toFixed(2)} ${job.currency}).`,
        },
      });
    });

    await markShamCashPayoutJobCompleted(job.id, result.transactionId);
    console.log(`ShamCash payout completed: ${job.id}`);
    return true;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ShamCash payout failed during worker execution";

    const { willRetry } = await markShamCashPayoutJobFailed({
      jobId: job.id,
      errorMessage: message,
      attempts: job.attempts,
      maxAttempts: MAX_ATTEMPTS,
    });

    if (!willRetry) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: job.userId },
          data: {
            balance: {
              increment: job.amount,
            },
          },
        });

        await tx.notification.create({
          data: {
            userId: job.userId,
            title: "⏳ Your request is under review",
            message: `Your withdrawal request (${job.amount.toFixed(2)} ${job.currency}) is under review. The amount has been returned to your balance for now.`,
          },
        });
      });
    }

    console.error(
      `ShamCash payout failed: ${job.id}. Retry: ${willRetry}. Error: ${message}`,
    );

    return true;
  }
};

const runWorker = async () => {
  const mode = String(process.env.SHAMCASH_PAYOUT_MODE || "QUEUE_PLAYWRIGHT")
    .trim()
    .toUpperCase();

  if (mode === "API") {
    throw new Error(
      "SHAMCASH_PAYOUT_MODE is API. Worker is only needed for QUEUE_PLAYWRIGHT mode.",
    );
  }

  if (!String(process.env.REDIS_URL || "").trim()) {
    throw new Error(
      "REDIS_URL is required for the ShamCash payout queue worker.",
    );
  }

  console.log("ShamCash payout worker started");
  console.log(`Poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`Max attempts: ${MAX_ATTEMPTS}`);

  while (true) {
    try {
      const handled = await processOneJob();
      if (!handled) {
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error) {
      console.error("Worker loop error:", error);
      await sleep(POLL_INTERVAL_MS);
    }
  }
};

runWorker().catch((error) => {
  console.error("Failed to start ShamCash payout worker:", error);
  process.exit(1);
});
