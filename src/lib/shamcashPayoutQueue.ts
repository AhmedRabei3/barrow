import { randomUUID } from "crypto";
import { getRedisClient } from "@/lib/redis";

export type ShamCashPayoutQueueJob = {
  id: string;
  userId: string;
  walletCode: string;
  amount: number;
  currency: string;
  note: string;
  requestedAt: string;
  attempts: number;
};

export type ShamCashPayoutQueueStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type ShamCashPayoutQueueJobDetails = ShamCashPayoutQueueJob & {
  status: ShamCashPayoutQueueStatus;
  transactionId: string;
  lastError: string;
  processingStartedAt: string;
  completedAt: string;
  failedAt: string;
  updatedAt: string;
  pendingPosition: number | null;
};

const QUEUE_KEY = "queue:shamcash:payout:pending";
const JOB_HASH_PREFIX = "queue:shamcash:payout:job:";

const toJobKey = (jobId: string) => `${JOB_HASH_PREFIX}${jobId}`;

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
      if (typeof key === "undefined" || typeof value === "undefined") continue;
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

const parseStatus = (value: string | undefined): ShamCashPayoutQueueStatus => {
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
      "Redis is not configured. Set REDIS_URL to enable payout queue.",
    );
  }

  return redis;
};

const toNumber = (value: string | undefined, fallback = 0) => {
  const num = Number(value ?? "");
  return Number.isFinite(num) ? num : fallback;
};

const parseStoredJob = (
  payload: Record<string, string>,
): ShamCashPayoutQueueJob | null => {
  if (!payload.id || !payload.userId || !payload.walletCode) {
    return null;
  }

  return {
    id: payload.id,
    userId: payload.userId,
    walletCode: payload.walletCode,
    amount: toNumber(payload.amount),
    currency: payload.currency || "USD",
    note: payload.note || "",
    requestedAt: payload.requestedAt || new Date().toISOString(),
    attempts: Math.max(0, Math.floor(toNumber(payload.attempts))),
  };
};

const parseStoredJobDetails = (
  payload: Record<string, string>,
): ShamCashPayoutQueueJobDetails | null => {
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

export const enqueueShamCashPayoutJob = async (input: {
  userId: string;
  walletCode: string;
  amount: number;
  note?: string;
  currency?: string;
}): Promise<ShamCashPayoutQueueJob> => {
  const redis = await ensureRedisReady();

  const amount = Number(input.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid payout amount");
  }

  const id = randomUUID();
  const requestedAt = new Date().toISOString();
  const job: ShamCashPayoutQueueJob = {
    id,
    userId: String(input.userId || "").trim(),
    walletCode: String(input.walletCode || "").trim(),
    amount: Number(amount.toFixed(2)),
    currency: String(input.currency || "USD").trim() || "USD",
    note: String(input.note || "").trim(),
    requestedAt,
    attempts: 0,
  };

  if (!job.userId || !job.walletCode) {
    throw new Error("Payout queue job is missing user or wallet information");
  }

  await redis.hSet(toJobKey(job.id), {
    id: job.id,
    userId: job.userId,
    walletCode: job.walletCode,
    amount: String(job.amount),
    currency: job.currency,
    note: job.note,
    requestedAt: job.requestedAt,
    attempts: "0",
    status: "PENDING",
    updatedAt: requestedAt,
  });

  await redis.rPush(QUEUE_KEY, job.id);
  return job;
};

export const claimNextShamCashPayoutJob =
  async (): Promise<ShamCashPayoutQueueJob | null> => {
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
        lastError: "Corrupted queue job payload",
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

export const markShamCashPayoutJobCompleted = async (
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

export const markShamCashPayoutJobFailed = async (input: {
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
    lastError: String(input.errorMessage || "Unknown payout queue error"),
    updatedAt: new Date().toISOString(),
    failedAt: new Date().toISOString(),
  });

  if (willRetry) {
    await redis.rPush(QUEUE_KEY, input.jobId);
  }

  return { willRetry };
};

export const listShamCashPayoutJobs = async (input?: {
  status?: ShamCashPayoutQueueStatus | "ALL";
  limit?: number;
}): Promise<{
  jobs: ShamCashPayoutQueueJobDetails[];
  queueSize: number;
  totalJobs: number;
  filteredCount: number;
  statusCounts: Record<ShamCashPayoutQueueStatus, number>;
}> => {
  const redis = await ensureRedisReady();

  const rawLimit = Number(input?.limit ?? 100);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 500)
      : 100;

  const requestedStatus = String(input?.status || "ALL")
    .trim()
    .toUpperCase() as ShamCashPayoutQueueStatus | "ALL";

  const pendingJobIds = await redis.lRange(QUEUE_KEY, 0, -1);
  const queueSize = pendingJobIds.length;

  const pendingPositionByJobId = new Map<string, number>();
  for (let index = 0; index < pendingJobIds.length; index += 1) {
    const jobId = String(pendingJobIds[index]);
    if (!pendingPositionByJobId.has(jobId)) {
      pendingPositionByJobId.set(jobId, index + 1);
    }
  }

  const keys = await redis.keys(`${JOB_HASH_PREFIX}*`);
  if (!keys.length) {
    return {
      jobs: [],
      queueSize,
      totalJobs: 0,
      filteredCount: 0,
      statusCounts: {
        PENDING: 0,
        PROCESSING: 0,
        COMPLETED: 0,
        FAILED: 0,
      },
    };
  }

  const jobsRaw = await Promise.all(keys.map((key) => redis.hGetAll(key)));
  const parsedJobs = jobsRaw
    .map((payload) => parseStoredJobDetails(normalizeRedisHashPayload(payload)))
    .filter((job): job is ShamCashPayoutQueueJobDetails => Boolean(job))
    .map((job) => ({
      ...job,
      pendingPosition:
        job.status === "PENDING"
          ? pendingPositionByJobId.get(job.id) || null
          : null,
    }));

  const statusCounts: Record<ShamCashPayoutQueueStatus, number> = {
    PENDING: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    FAILED: 0,
  };

  for (const job of parsedJobs) {
    statusCounts[job.status] += 1;
  }

  const filteredJobs = parsedJobs.filter((job) =>
    requestedStatus === "ALL" ? true : job.status === requestedStatus,
  );

  const jobs = filteredJobs
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.requestedAt).getTime();
      const bTime = new Date(b.updatedAt || b.requestedAt).getTime();
      return bTime - aTime;
    })
    .slice(0, limit);

  return {
    jobs,
    queueSize,
    totalJobs: parsedJobs.length,
    filteredCount: filteredJobs.length,
    statusCounts,
  };
};

export const retryShamCashPayoutJob = async (
  jobId: string,
): Promise<ShamCashPayoutQueueJobDetails> => {
  const redis = await ensureRedisReady();

  const normalizedJobId = String(jobId || "").trim();
  if (!normalizedJobId) {
    throw new Error("Missing payout job id");
  }

  const key = toJobKey(normalizedJobId);
  const payload = normalizeRedisHashPayload(await redis.hGetAll(key));
  const job = parseStoredJobDetails(payload);

  if (!job) {
    throw new Error("Payout job not found");
  }

  if (job.status !== "FAILED") {
    throw new Error("Only failed payout jobs can be retried");
  }

  const nowIso = new Date().toISOString();
  const queueSize = Number(await redis.rPush(QUEUE_KEY, normalizedJobId));

  await redis.hSet(key, {
    status: "PENDING",
    attempts: "0",
    lastError: "",
    processingStartedAt: "",
    completedAt: "",
    failedAt: "",
    transactionId: "",
    updatedAt: nowIso,
  });

  return {
    ...job,
    attempts: 0,
    status: "PENDING",
    lastError: "",
    processingStartedAt: "",
    completedAt: "",
    failedAt: "",
    transactionId: "",
    updatedAt: nowIso,
    pendingPosition: Number.isFinite(queueSize) ? queueSize : null,
  };
};
