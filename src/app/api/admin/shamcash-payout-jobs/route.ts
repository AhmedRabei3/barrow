import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAbminUser } from "@/app/api/utils/authHelper";
import {
  listShamCashPayoutJobs,
  retryShamCashPayoutJob,
} from "@/lib/shamcashPayoutQueue";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { ShamCashManualWithdrawalStatus } from "@prisma/client";

const VALID_STATUSES = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const;

type JobStatusFilter = (typeof VALID_STATUSES)[number];
type QueueStatus = Exclude<JobStatusFilter, "ALL">;

const EMPTY_STATUS_COUNTS: Record<QueueStatus, number> = {
  PENDING: 0,
  PROCESSING: 0,
  COMPLETED: 0,
  FAILED: 0,
};

const toIso = (value: Date | string | null | undefined) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toISOString();
};

const mapManualStatusToQueueStatus = (
  status: ShamCashManualWithdrawalStatus,
): QueueStatus => {
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "REJECTED") return "FAILED";
  if (status === "VERIFYING") return "PROCESSING";
  return "PENDING";
};

const resolveManualStatusesFromFilter = (status: JobStatusFilter) => {
  if (status === "ALL") return undefined;
  if (status === "PENDING") {
    return ["PENDING_ADMIN"] as ShamCashManualWithdrawalStatus[];
  }
  if (status === "PROCESSING") {
    return ["VERIFYING"] as ShamCashManualWithdrawalStatus[];
  }
  if (status === "COMPLETED") {
    return ["COMPLETED"] as ShamCashManualWithdrawalStatus[];
  }
  return ["REJECTED"] as ShamCashManualWithdrawalStatus[];
};

const mergeStatusCounts = (
  queueCounts: Record<QueueStatus, number>,
  manualCounts: Record<QueueStatus, number>,
) => ({
  PENDING: Number(queueCounts.PENDING || 0) + Number(manualCounts.PENDING || 0),
  PROCESSING:
    Number(queueCounts.PROCESSING || 0) + Number(manualCounts.PROCESSING || 0),
  COMPLETED:
    Number(queueCounts.COMPLETED || 0) + Number(manualCounts.COMPLETED || 0),
  FAILED: Number(queueCounts.FAILED || 0) + Number(manualCounts.FAILED || 0),
});

const parseLimit = (raw: string | null): number => {
  const parsed = Number(raw ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }

  return Math.min(Math.floor(parsed), 500);
};

const resolveAuthStatus = (message: string) => {
  const lowered = message.toLowerCase();
  if (lowered.includes("unauthorized")) return 401;
  if (lowered.includes("forbidden") || lowered.includes("access denied")) {
    return 403;
  }
  return 500;
};

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    await requireAbminUser();

    const statusParam = String(req.nextUrl.searchParams.get("status") || "ALL")
      .trim()
      .toUpperCase() as JobStatusFilter;

    if (!VALID_STATUSES.includes(statusParam)) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Invalid payout job status filter",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
    const manualStatusFilter = resolveManualStatusesFromFilter(statusParam);

    let queueEnabled = true;
    let queueData: {
      queueSize: number;
      totalJobs: number;
      filteredCount: number;
      statusCounts: Record<QueueStatus, number>;
      jobs: Array<{
        id: string;
        userId: string;
        walletCode: string;
        amount: number;
        currency: string;
        note: string;
        status: QueueStatus;
        transactionId: string;
        lastError: string;
        requestedAt: string;
        updatedAt: string;
        attempts: number;
        pendingPosition: number | null;
        processingStartedAt: string;
        completedAt: string;
        failedAt: string;
      }>;
    } = {
      queueSize: 0,
      totalJobs: 0,
      filteredCount: 0,
      statusCounts: { ...EMPTY_STATUS_COUNTS },
      jobs: [],
    };

    try {
      queueData = await listShamCashPayoutJobs({
        status: statusParam,
        limit,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Redis is not configured")) {
        queueEnabled = false;
      } else {
        throw error;
      }
    }

    const payoutMode = String(
      process.env.SHAMCASH_PAYOUT_MODE || "QUEUE_PLAYWRIGHT",
    )
      .trim()
      .toUpperCase();

    const manualStatusCountRows = await prisma.shamCashManualWithdrawal.groupBy(
      {
        by: ["status"],
        _count: {
          _all: true,
        },
      },
    );

    const manualStatusCounts: Record<QueueStatus, number> = {
      ...EMPTY_STATUS_COUNTS,
    };

    for (const row of manualStatusCountRows) {
      const mappedStatus = mapManualStatusToQueueStatus(row.status);
      manualStatusCounts[mappedStatus] += Number(row._count._all || 0);
    }

    const manualTotalJobs =
      manualStatusCounts.PENDING +
      manualStatusCounts.PROCESSING +
      manualStatusCounts.COMPLETED +
      manualStatusCounts.FAILED;

    const manualFilteredCount =
      statusParam === "ALL"
        ? manualTotalJobs
        : manualStatusCounts[statusParam as QueueStatus];

    const manualRowsRaw = await prisma.shamCashManualWithdrawal.findMany({
      where: manualStatusFilter
        ? { status: { in: manualStatusFilter } }
        : undefined,
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        userId: true,
        walletCode: true,
        amount: true,
        currency: true,
        note: true,
        status: true,
        transactionId: true,
        failureReason: true,
        qrCode: true,
        requestedAt: true,
        updatedAt: true,
        verifiedAt: true,
        completedAt: true,
      },
    });

    const manualRows = manualRowsRaw.map((row) => ({
      id: `manual-${row.id}`,
      manualRequestId: row.id,
      source: "MANUAL_FALLBACK" as const,
      userId: row.userId,
      walletCode: row.walletCode || "",
      amount: Number(row.amount || 0),
      currency: row.currency || "USD",
      note: row.note || "",
      status: mapManualStatusToQueueStatus(row.status),
      transactionId: row.transactionId || "",
      lastError: row.failureReason || "",
      requestedAt: toIso(row.requestedAt),
      updatedAt: toIso(row.updatedAt),
      attempts: 0,
      pendingPosition: null,
      processingStartedAt: toIso(row.verifiedAt),
      completedAt: toIso(row.completedAt),
      failedAt: row.status === "REJECTED" ? toIso(row.updatedAt) : "",
      qrCode: row.qrCode || "",
    }));

    const uniqueUserIds = Array.from(
      new Set([
        ...queueData.jobs.map((job) => job.userId),
        ...manualRows.map((row) => row.userId),
      ]),
    );

    const users = uniqueUserIds.length
      ? await prisma.user.findMany({
          where: { id: { in: uniqueUserIds } },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const usersMap = new Map(users.map((user) => [user.id, user]));

    const queueRows = queueData.jobs.map((job) => {
      const user = usersMap.get(job.userId);

      return {
        ...job,
        source: "QUEUE_PLAYWRIGHT" as const,
        manualRequestId: "",
        qrCode: "",
        userName: user?.name || "",
        userEmail: user?.email || "",
      };
    });

    const hydratedManualRows = manualRows.map((row) => {
      const user = usersMap.get(row.userId);

      return {
        ...row,
        userName: user?.name || "",
        userEmail: user?.email || "",
      };
    });

    const combinedStatusCounts = mergeStatusCounts(
      queueData.statusCounts,
      manualStatusCounts,
    );

    const totalJobs =
      Number(queueData.totalJobs || 0) + Number(manualTotalJobs || 0);

    const filteredCount =
      statusParam === "ALL"
        ? totalJobs
        : Number(queueData.filteredCount || 0) +
          Number(manualFilteredCount || 0);

    const jobs = [...queueRows, ...hydratedManualRows]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.requestedAt).getTime() -
          new Date(a.updatedAt || a.requestedAt).getTime(),
      )
      .slice(0, limit);

    return NextResponse.json(
      {
        filters: {
          status: statusParam,
          limit,
        },
        summary: {
          queueSize:
            Number(combinedStatusCounts.PENDING || 0) +
            Number(combinedStatusCounts.PROCESSING || 0),
          totalJobs,
          filteredCount,
          statusCounts: combinedStatusCounts,
        },
        runtime: {
          payoutMode,
          workerRequired: payoutMode !== "API" && queueEnabled,
          queueEnabled,
        },
        jobs,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load payout jobs";
    const statusCode = resolveAuthStatus(message);

    return NextResponse.json(
      {
        message: localizeErrorMessage(message, isArabic),
      },
      { status: statusCode },
    );
  }
}

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    await requireAbminUser();

    const body = (await req.json()) as {
      action?: string;
      jobId?: string;
    };

    const action = String(body.action || "")
      .trim()
      .toUpperCase();
    if (action !== "RETRY") {
      return NextResponse.json(
        {
          message: localizeErrorMessage("Invalid payout jobs action", isArabic),
        },
        { status: 400 },
      );
    }

    const jobId = String(body.jobId || "").trim();
    if (!jobId) {
      return NextResponse.json(
        {
          message: localizeErrorMessage("Missing payout job id", isArabic),
        },
        { status: 400 },
      );
    }

    const retried = await retryShamCashPayoutJob(jobId);

    await prisma.notification
      .create({
        data: {
          userId: retried.userId,
          title: t("⏳ طلبك قيد المراجعة", "⏳ Your request is under review"),
          message: t(
            `طلب السحب بقيمة ${retried.amount.toFixed(2)} ${retried.currency} قيد المراجعة حالياً.`,
            `Your withdrawal request (${retried.amount.toFixed(2)} ${retried.currency}) is currently under review.`,
          ),
        },
      })
      .catch(() => null);

    return NextResponse.json(
      {
        success: true,
        message: t(
          "تمت إعادة الطلب إلى قائمة المعالجة بنجاح",
          "Payout job has been queued again",
        ),
        job: retried,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retry payout job";
    const statusCode = resolveAuthStatus(message);

    return NextResponse.json(
      {
        message: localizeErrorMessage(message, isArabic),
      },
      { status: statusCode },
    );
  }
}
