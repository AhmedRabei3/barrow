import { randomUUID } from "crypto";
import type { ItemType } from "@prisma/client";
import { getRedisClient } from "@/lib/redis";

export type ShamCashIncomingPaymentType = "SUBSCRIPTION" | "FEATURED_AD";

export type ShamCashIncomingPaymentJob = {
  id: string;
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  type: ShamCashIncomingPaymentType;
  itemId: string;
  itemType: ItemType | "";
  expectedEmail: string;
  expectedNote: string;
  requestedAt: string;
  attempts: number;
  referralDiscountApplied: boolean;
  originalAmount: number;
};

export type ShamCashIncomingPaymentJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type ShamCashIncomingPaymentJobDetails = ShamCashIncomingPaymentJob & {
  status: ShamCashIncomingPaymentJobStatus;
  transactionId: string;
  lastError: string;
  processingStartedAt: string;
  completedAt: string;
  failedAt: string;
  updatedAt: string;
  pendingPosition: number | null;
};

const QUEUE_KEY = "queue:shamcash:incoming:pending";
const JOB_HASH_PREFIX = "queue:shamcash:incoming:job:";
const PAYMENT_TO_JOB_PREFIX = "queue:shamcash:incoming:payment:";

const toJobKey = (jobId: string) => `${JOB_HASH_PREFIX}${jobId}`;
const toPaymentMapKey = (paymentId: string) =>
  `${PAYMENT_TO_JOB_PREFIX}${paymentId}`;

const normalizeRedisHashPayload = (
  payload:
    | Record<string, string | Buffer>
    | Map<string, string | Buffer>
    | Array<string | Buffer>
    | null
    | undefined,
): Record<string, string> => {
  if (!payload) return {};

  if (Array.isArray(payload)) {
    const record: Record<string, string> = {};
    for (let index = 0; index < payload.length; index += 2) {
      const key = payload[index];
      const value = payload[index + 1];
      if (typeof key === "undefined" || typeof value === "undefined") {
        continue;
      }
      record[String(key)] = String(value);
    }
    return record;
  }

  if (payload instanceof Map) {
    const record: Record<string, string> = {};
    for (const [key, value] of payload.entries()) {
      record[String(key)] = String(value);
    }
    return record;
  }

  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    record[key] = String(value);
  }
  return record;
};

const parseStatus = (
  value: string | undefined,
): ShamCashIncomingPaymentJobStatus => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (normalized === "PROCESSING") return "PROCESSING";
  if (normalized === "COMPLETED") return "COMPLETED";
  if (normalized === "FAILED") return "FAILED";
  return "PENDING";
};

const ensureRedisReady = async () => {
  const redis = await getRedisClient();
  if (!redis?.isReady) {
    throw new Error(
      "Redis is not configured. Set REDIS_URL to enable ShamCash incoming queue.",
    );
  }

  return redis;
};

const toNumber = (value: string | undefined, fallback = 0) => {
  const num = Number(value ?? "");
  return Number.isFinite(num) ? num : fallback;
};

const toBoolean = (value: string | undefined) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
};

const parseStoredJob = (
  payload: Record<string, string>,
): ShamCashIncomingPaymentJob | null => {
  const type = String(payload.type || "")
    .trim()
    .toUpperCase();

  if (
    !payload.id ||
    !payload.paymentId ||
    !payload.userId ||
    !["SUBSCRIPTION", "FEATURED_AD"].includes(type)
  ) {
    return null;
  }

  return {
    id: payload.id,
    paymentId: payload.paymentId,
    userId: payload.userId,
    amount: toNumber(payload.amount),
    currency: payload.currency || "USD",
    type: type as ShamCashIncomingPaymentType,
    itemId: payload.itemId || "",
    itemType: (payload.itemType as ItemType | "") || "",
    expectedEmail: payload.expectedEmail || "",
    expectedNote: payload.expectedNote || "",
    requestedAt: payload.requestedAt || new Date().toISOString(),
    attempts: Math.max(0, Math.floor(toNumber(payload.attempts))),
    referralDiscountApplied: toBoolean(payload.referralDiscountApplied),
    originalAmount: toNumber(payload.originalAmount),
  };
};

const parseStoredJobDetails = (
  payload: Record<string, string>,
): ShamCashIncomingPaymentJobDetails | null => {
  const base = parseStoredJob(payload);
  if (!base) {
    return null;
  }

  return {
    ...base,
    status: parseStatus(payload.status),
    transactionId: payload.transactionId || "",
    lastError: payload.lastError || "",
    processingStartedAt: payload.processingStartedAt || "",
    completedAt: payload.completedAt || "",
    failedAt: payload.failedAt || "",
    updatedAt: payload.updatedAt || payload.requestedAt || "",
    pendingPosition: null,
  };
};

export const enqueueShamCashIncomingPaymentJob = async (input: {
  paymentId: string;
  userId: string;
  amount: number;
  currency?: string;
  type: ShamCashIncomingPaymentType;
  itemId?: string;
  itemType?: ItemType;
  expectedEmail: string;
  expectedNote?: string;
  referralDiscountApplied?: boolean;
  originalAmount?: number;
}): Promise<ShamCashIncomingPaymentJob> => {
  const redis = await ensureRedisReady();

  const amount = Number(input.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid ShamCash incoming amount");
  }

  const paymentId = String(input.paymentId || "").trim();
  const userId = String(input.userId || "").trim();
  const expectedEmail = String(input.expectedEmail || "").trim();
  const type = String(input.type || "")
    .trim()
    .toUpperCase() as ShamCashIncomingPaymentType;

  if (!paymentId || !userId || !expectedEmail) {
    throw new Error("Incoming payment job is missing required fields");
  }

  if (!["SUBSCRIPTION", "FEATURED_AD"].includes(type)) {
    throw new Error("Invalid ShamCash incoming payment type");
  }

  const id = randomUUID();
  const requestedAt = new Date().toISOString();

  const job: ShamCashIncomingPaymentJob = {
    id,
    paymentId,
    userId,
    amount: Number(amount.toFixed(2)),
    currency: String(input.currency || "USD").trim() || "USD",
    type,
    itemId: String(input.itemId || "").trim(),
    itemType: (input.itemType || "") as ItemType | "",
    expectedEmail,
    expectedNote: String(input.expectedNote || expectedEmail).trim(),
    requestedAt,
    attempts: 0,
    referralDiscountApplied: Boolean(input.referralDiscountApplied),
    originalAmount:
      Number.isFinite(Number(input.originalAmount)) &&
      Number(input.originalAmount) > 0
        ? Number(Number(input.originalAmount).toFixed(2))
        : Number(amount.toFixed(2)),
  };

  await redis.hSet(toJobKey(job.id), {
    id: job.id,
    paymentId: job.paymentId,
    userId: job.userId,
    amount: String(job.amount),
    currency: job.currency,
    type: job.type,
    itemId: job.itemId,
    itemType: job.itemType,
    expectedEmail: job.expectedEmail,
    expectedNote: job.expectedNote,
    requestedAt: job.requestedAt,
    attempts: "0",
    referralDiscountApplied: job.referralDiscountApplied ? "1" : "0",
    originalAmount: String(job.originalAmount),
    status: "PENDING",
    updatedAt: requestedAt,
  });

  await redis.set(toPaymentMapKey(job.paymentId), job.id);
  await redis.rPush(QUEUE_KEY, job.id);

  return job;
};

export const claimNextShamCashIncomingPaymentJob =
  async (): Promise<ShamCashIncomingPaymentJob | null> => {
    const redis = await ensureRedisReady();

    const rawJobId = await redis.lPop(QUEUE_KEY);
    const jobId = rawJobId ? String(rawJobId) : "";
    if (!jobId) {
      return null;
    }

    const key = toJobKey(jobId);
    const payload = normalizeRedisHashPayload(await redis.hGetAll(key));
    const parsed = parseStoredJob(payload);

    if (!parsed) {
      await redis.hSet(key, {
        status: "FAILED",
        lastError: "Corrupted incoming queue job payload",
        updatedAt: new Date().toISOString(),
      });
      return null;
    }

    const attempts = parsed.attempts + 1;

    await redis.hSet(key, {
      attempts: String(attempts),
      status: "PROCESSING",
      processingStartedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      ...parsed,
      attempts,
    };
  };

export const markShamCashIncomingPaymentJobCompleted = async (
  jobId: string,
  transactionId: string,
) => {
  const redis = await ensureRedisReady();

  await redis.hSet(toJobKey(jobId), {
    status: "COMPLETED",
    transactionId: String(transactionId || "").trim(),
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

export const markShamCashIncomingPaymentJobFailed = async (input: {
  jobId: string;
  errorMessage: string;
  attempts: number;
  maxAttempts: number;
}): Promise<{ willRetry: boolean }> => {
  const redis = await ensureRedisReady();

  const willRetry = input.attempts < input.maxAttempts;
  const key = toJobKey(input.jobId);

  await redis.hSet(key, {
    status: willRetry ? "PENDING" : "FAILED",
    lastError: String(input.errorMessage || "Unknown incoming queue error"),
    updatedAt: new Date().toISOString(),
    failedAt: new Date().toISOString(),
  });

  if (willRetry) {
    await redis.rPush(QUEUE_KEY, input.jobId);
  }

  return { willRetry };
};

export const getShamCashIncomingPaymentJobByPaymentId = async (
  paymentId: string,
): Promise<ShamCashIncomingPaymentJobDetails | null> => {
  const redis = await ensureRedisReady();
  const normalizedPaymentId = String(paymentId || "").trim();
  if (!normalizedPaymentId) {
    return null;
  }

  const jobId = String(
    (await redis.get(toPaymentMapKey(normalizedPaymentId))) || "",
  ).trim();

  if (!jobId) {
    return null;
  }

  const payload = normalizeRedisHashPayload(
    await redis.hGetAll(toJobKey(jobId)),
  );
  const job = parseStoredJobDetails(payload);

  if (!job) {
    return null;
  }

  if (job.status !== "PENDING") {
    return {
      ...job,
      pendingPosition: null,
    };
  }

  const pendingJobIds = await redis.lRange(QUEUE_KEY, 0, -1);
  let pendingPosition: number | null = null;

  for (let index = 0; index < pendingJobIds.length; index += 1) {
    if (String(pendingJobIds[index]) === job.id) {
      pendingPosition = index + 1;
      break;
    }
  }

  return {
    ...job,
    pendingPosition,
  };
};
