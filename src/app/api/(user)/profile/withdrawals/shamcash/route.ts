import { NextRequest, NextResponse } from "next/server";
import { authHelper } from "@/app/api/utils/authHelper";
import { prisma } from "@/lib/prisma";
import { listShamCashPayoutJobs } from "@/lib/shamcashPayoutQueue";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

type UserWithdrawalStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
type WithdrawalRow = {
  id: string;
  status: UserWithdrawalStatus;
  amount: number;
  currency: string;
  walletCode: string;
  note: string;
  requestedAt: string;
  updatedAt: string;
  transactionId: string;
  lastError: string;
  pendingPosition: number | null;
  source: "QUEUE_PLAYWRIGHT" | "API" | "PLAYWRIGHT_DIRECT" | "MANUAL_FALLBACK";
};

const VALID_STATUSES = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const;

type StatusFilter = (typeof VALID_STATUSES)[number];

const parseLimit = (raw: string | null): number => {
  const parsed = Number(raw ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }

  return Math.min(Math.floor(parsed), 200);
};

const mapManualStatusToUserStatus = (status: string): UserWithdrawalStatus => {
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "REJECTED") return "FAILED";
  if (status === "VERIFYING") return "PROCESSING";
  return "PENDING";
};

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    const session = await authHelper();

    const statusParam = String(req.nextUrl.searchParams.get("status") || "ALL")
      .trim()
      .toUpperCase() as StatusFilter;

    if (!VALID_STATUSES.includes(statusParam)) {
      return NextResponse.json(
        {
          message: localizeErrorMessage("Invalid status filter", isArabic),
        },
        { status: 400 },
      );
    }

    const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
    const payoutMode = String(
      process.env.SHAMCASH_PAYOUT_MODE || "QUEUE_PLAYWRIGHT",
    )
      .trim()
      .toUpperCase();

    const profile = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        balance: true,
      },
    });

    let queueRows: WithdrawalRow[] = [];

    let queueEnabled = true;

    try {
      const queueData = await listShamCashPayoutJobs({
        status: "ALL",
        limit: 500,
      });

      queueRows = queueData.jobs
        .filter((job) => job.userId === session.id)
        .map((job) => ({
          id: `queue-${job.id}`,
          status: job.status,
          amount: Number(job.amount || 0),
          currency: job.currency || "USD",
          walletCode: job.walletCode || "",
          note: job.note || "",
          requestedAt: job.requestedAt,
          updatedAt: job.updatedAt,
          transactionId: job.transactionId || "",
          lastError: job.lastError || "",
          pendingPosition: job.pendingPosition,
          source: "QUEUE_PLAYWRIGHT" as const,
        }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Redis is not configured")) {
        queueEnabled = false;
      } else {
        throw error;
      }
    }

    const apiLogs = await prisma.chargingLog.findMany({
      where: {
        userId: session.id,
        type: {
          in: ["SHAMCASH_API_WITHDRAWAL", "SHAMCASH_PLAYWRIGHT_WITHDRAWAL"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        amount: true,
        type: true,
        createdAt: true,
      },
    });

    const apiRows = apiLogs.map((log) => ({
      id: `api-${log.id}`,
      status: "COMPLETED" as const,
      amount: Math.abs(Number(log.amount || 0)),
      currency: "USD",
      walletCode: "",
      note: "",
      requestedAt: log.createdAt.toISOString(),
      updatedAt: log.createdAt.toISOString(),
      transactionId: "",
      lastError: "",
      pendingPosition: null,
      source:
        log.type === "SHAMCASH_PLAYWRIGHT_WITHDRAWAL"
          ? ("PLAYWRIGHT_DIRECT" as const)
          : ("API" as const),
    }));

    const manualRows: WithdrawalRow[] = (
      await prisma.shamCashManualWithdrawal.findMany({
        where: {
          userId: session.id,
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
        select: {
          id: true,
          status: true,
          amount: true,
          currency: true,
          walletCode: true,
          note: true,
          requestedAt: true,
          updatedAt: true,
          transactionId: true,
          failureReason: true,
        },
      })
    ).map((row) => ({
      id: `manual-${row.id}`,
      status: mapManualStatusToUserStatus(row.status),
      amount: Number(row.amount || 0),
      currency: row.currency || "USD",
      walletCode: row.walletCode || "",
      note: row.note || "",
      requestedAt: row.requestedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      transactionId: row.transactionId || "",
      lastError: row.failureReason || "",
      pendingPosition: null,
      source: "MANUAL_FALLBACK",
    }));

    const allRows = [...queueRows, ...manualRows, ...apiRows].sort(
      (a, b) =>
        new Date(b.updatedAt || b.requestedAt).getTime() -
        new Date(a.updatedAt || a.requestedAt).getTime(),
    );

    const filteredRows =
      statusParam === "ALL"
        ? allRows
        : allRows.filter((row) => row.status === statusParam);

    const rows = filteredRows.slice(0, limit);

    const statusCounts: Record<UserWithdrawalStatus, number> = {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
    };

    for (const row of allRows) {
      statusCounts[row.status] += 1;
    }

    return NextResponse.json(
      {
        filters: {
          status: statusParam,
          limit,
        },
        runtime: {
          payoutMode,
          queueEnabled,
        },
        summary: {
          totalRows: allRows.length,
          filteredCount: filteredRows.length,
          statusCounts,
          availableBalance: Number(profile?.balance ?? 0),
        },
        rows,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load withdrawals";

    return NextResponse.json(
      {
        message: localizeErrorMessage(message, isArabic),
      },
      { status: 500 },
    );
  }
}
