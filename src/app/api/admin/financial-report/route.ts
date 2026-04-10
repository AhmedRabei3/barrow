import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { calculatePlatformProfitSummary } from "@/lib/platformProfitSummary";

const PAYOUT_LOG_TYPES = [
  "PAYPAL_WITHDRAWAL",
  "SHAMCASH_API_WITHDRAWAL",
  "SHAMCASH_PLAYWRIGHT_WITHDRAWAL",
  "SHAMCASH_MANUAL_WITHDRAWAL",
  "MANUAL_WITHDRAWAL_SETTLED",
] as const;

const REPORT_CHANNELS = [
  "ALL",
  "PAYPAL",
  "SHAMCASH",
  "MANUAL",
  "OTHER",
] as const;

type ReportChannel = (typeof REPORT_CHANNELS)[number];

type ChannelBreakdownRow = {
  channel: Exclude<ReportChannel, "ALL">;
  amount: number;
  count: number;
};

type SubscriptionMethodKey =
  | "PAYPAL"
  | "SHAMCASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "CRYPTO"
  | "BALANCE"
  | "OTHER";

type SubscriptionMethodBreakdownRow = {
  method: SubscriptionMethodKey;
  amount: number;
  count: number;
  percentage: number;
};

type ProfitLedgerBreakdownRow = {
  type: string;
  amount: number;
  count: number;
};

type ProfitLedgerEntryRow = {
  id: string;
  type: string;
  amount: number;
  createdAt: string;
  referenceId: string;
  note: string;
  userId: string;
  userName: string;
  userEmail: string;
};

const parseDateOnly = (value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toStartOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const toEndOfDay = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );

const toStartOfWeek = (date: Date) => {
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diffToMonday);
  return toStartOfDay(weekStart);
};

const resolvePaymentChannel = (method: string): ReportChannel => {
  if (method === "PAYPAL") return "PAYPAL";
  if (method === "SHAMCASH") return "SHAMCASH";
  return "OTHER";
};

const resolvePayoutChannel = (type: string): ReportChannel => {
  if (type === "PAYPAL_WITHDRAWAL") return "PAYPAL";
  if (
    type === "SHAMCASH_API_WITHDRAWAL" ||
    type === "SHAMCASH_PLAYWRIGHT_WITHDRAWAL" ||
    type === "SHAMCASH_MANUAL_WITHDRAWAL"
  )
    return "SHAMCASH";
  if (type === "MANUAL_WITHDRAWAL_SETTLED") return "MANUAL";
  return "OTHER";
};

const isWithinRange = (createdAtIso: string, start: Date, end: Date) => {
  const value = new Date(createdAtIso).getTime();
  return value >= start.getTime() && value <= end.getTime();
};

const REPORTABLE_CHANNELS: Array<Exclude<ReportChannel, "ALL">> = [
  "PAYPAL",
  "SHAMCASH",
  "MANUAL",
  "OTHER",
];

const REPORTABLE_SUBSCRIPTION_METHODS: SubscriptionMethodKey[] = [
  "PAYPAL",
  "SHAMCASH",
  "CARD",
  "BANK_TRANSFER",
  "CRYPTO",
  "BALANCE",
  "OTHER",
];

const PAYMENT_MATCH_WINDOW_MS = 15 * 60 * 1000;

const buildBreakdown = (
  rows: Array<{ channel: ReportChannel; amount: number }>,
): ChannelBreakdownRow[] =>
  REPORTABLE_CHANNELS.map((channel) => ({
    channel,
    amount: rows
      .filter((row) => row.channel === channel)
      .reduce((sum, row) => sum + row.amount, 0),
    count: rows.filter((row) => row.channel === channel).length,
  }));

const normalizeSubscriptionMethod = (method: string): SubscriptionMethodKey => {
  if (method === "PAYPAL") return "PAYPAL";
  if (method === "SHAMCASH") return "SHAMCASH";
  if (method === "CARD") return "CARD";
  if (method === "BANK_TRANSFER") return "BANK_TRANSFER";
  if (method === "CRYPTO") return "CRYPTO";
  if (method === "BALANCE") return "BALANCE";
  return "OTHER";
};

const buildSubscriptionMethodBreakdown = (
  rows: Array<{ method: SubscriptionMethodKey; amount: number }>,
): SubscriptionMethodBreakdownRow[] => {
  const totalCount = rows.length;

  return REPORTABLE_SUBSCRIPTION_METHODS.map((method) => {
    const methodRows = rows.filter((row) => row.method === method);
    const count = methodRows.length;
    return {
      method,
      count,
      amount: methodRows.reduce((sum, row) => sum + row.amount, 0),
      percentage:
        totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(2)) : 0,
    };
  });
};

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    await requireAdminUser();

    const now = new Date();
    const defaultDateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultDateTo = now;

    const rawDateFrom = req.nextUrl.searchParams.get("dateFrom");
    const rawDateTo = req.nextUrl.searchParams.get("dateTo");
    const rawChannel = req.nextUrl.searchParams.get("channel");

    const parsedFrom = parseDateOnly(rawDateFrom);
    const parsedTo = parseDateOnly(rawDateTo);

    if ((rawDateFrom && !parsedFrom) || (rawDateTo && !parsedTo)) {
      return NextResponse.json(
        {
          message: localizeErrorMessage("Invalid date filter", isArabic),
        },
        { status: 400 },
      );
    }

    const dateFrom = toStartOfDay(parsedFrom || defaultDateFrom);
    const dateTo = toEndOfDay(parsedTo || defaultDateTo);
    const selectedChannel = (
      rawChannel || "ALL"
    ).toUpperCase() as ReportChannel;

    if (!REPORT_CHANNELS.includes(selectedChannel)) {
      return NextResponse.json(
        {
          message: localizeErrorMessage("Invalid channel filter", isArabic),
        },
        { status: 400 },
      );
    }

    if (dateFrom > dateTo) {
      return NextResponse.json(
        {
          message: localizeErrorMessage("Invalid date range", isArabic),
        },
        { status: 400 },
      );
    }

    const todayStart = toStartOfDay(now);
    const todayEnd = toEndOfDay(now);
    const weekStart = toStartOfWeek(now);
    const weekEnd = todayEnd;

    const [
      paymentsInRange,
      shamCashActivationsInRange,
      payoutsInRange,
      allReceivedByMethodAgg,
      paidOutPaypalAgg,
      paidOutShamCashAgg,
      usersAgg,
      totalSubscribers,
      activeSubscribers,
      pendingManualWithdrawalsAgg,
      previousOwnerWithdrawalsAgg,
      todayProfitAgg,
      weekProfitAgg,
      profitLedgerInRange,
    ] = await Promise.all([
      prisma.payment.findMany({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          payerId: true,
          method: true,
          amount: true,
          currency: true,
          createdAt: true,
          payer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.shamCashActivationRequest.findMany({
        where: {
          status: "ACTIVATED",
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          txNumber: true,
          amount: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.chargingLog.findMany({
        where: {
          type: { in: [...PAYOUT_LOG_TYPES] },
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          amount: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.payment.groupBy({
        by: ["method"],
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
      prisma.chargingLog.aggregate({
        where: { type: "PAYPAL_WITHDRAWAL" },
        _sum: { amount: true },
      }),
      prisma.chargingLog.aggregate({
        where: {
          type: {
            in: [
              "SHAMCASH_API_WITHDRAWAL",
              "SHAMCASH_PLAYWRIGHT_WITHDRAWAL",
              "SHAMCASH_MANUAL_WITHDRAWAL",
            ],
          },
        },
        _sum: { amount: true },
      }),
      prisma.user.aggregate({
        where: { isDeleted: false },
        _sum: {
          balance: true,
          pendingReferralEarnings: true,
        },
      }),
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.user.count({ where: { isDeleted: false, isActive: true } }),
      prisma.shamCashManualWithdrawal.aggregate({
        where: {
          status: {
            in: ["PENDING_ADMIN", "VERIFYING"],
          },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.ownerProfitWithdrawal.aggregate({
        _sum: { amount: true },
      }),
      prisma.platformProfitLedger.aggregate({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        _sum: { amount: true },
      }),
      prisma.platformProfitLedger.aggregate({
        where: {
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        _sum: { amount: true },
      }),
      prisma.platformProfitLedger.findMany({
        where: {
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          amount: true,
          note: true,
          referenceId: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const receivedRows = paymentsInRange.map((payment) => ({
      id: `payment-${payment.id}`,
      kind: "RECEIVED" as const,
      channel: resolvePaymentChannel(payment.method),
      subscriptionMethod: normalizeSubscriptionMethod(payment.method),
      amount: Number(payment.amount ?? 0),
      currency: payment.currency || "USD",
      createdAt: payment.createdAt.toISOString(),
      reference: payment.id,
      userId: payment.payer?.id || "",
      userName: payment.payer?.name || "",
      userEmail: payment.payer?.email || "",
    }));

    const orphanedActivatedShamCashRows = shamCashActivationsInRange
      .filter((activation) => {
        const activationAmount = Number(activation.amount ?? 0);
        const activationCreatedAt = activation.createdAt.getTime();

        return !paymentsInRange.some((payment) => {
          if (payment.method !== "SHAMCASH") return false;
          if (payment.payerId !== activation.userId) return false;
          if (Number(payment.amount ?? 0) !== activationAmount) return false;

          return (
            Math.abs(payment.createdAt.getTime() - activationCreatedAt) <=
            PAYMENT_MATCH_WINDOW_MS
          );
        });
      })
      .map((activation) => ({
        id: `activation-${activation.id}`,
        kind: "RECEIVED" as const,
        channel: "SHAMCASH" as const,
        subscriptionMethod: "SHAMCASH" as const,
        amount: Number(activation.amount ?? 0),
        currency: "USD",
        createdAt: activation.createdAt.toISOString(),
        reference: activation.txNumber,
        userId: activation.user?.id || activation.userId,
        userName: activation.user?.name || "",
        userEmail: activation.user?.email || "",
      }));

    const allReceivedRows = [...receivedRows, ...orphanedActivatedShamCashRows];

    const payoutRows = payoutsInRange.map((payout) => {
      const channel = resolvePayoutChannel(payout.type);

      return {
        id: `payout-${payout.id}`,
        kind: "PAID_OUT" as const,
        channel,
        amount: Math.abs(Number(payout.amount ?? 0)),
        currency: "USD",
        createdAt: payout.createdAt.toISOString(),
        reference: payout.id,
        userId: payout.user?.id || "",
        userName: payout.user?.name || "",
        userEmail: payout.user?.email || "",
      };
    });

    const adminWithdrawals = payoutsInRange
      .filter((payout) => payout.type === "MANUAL_WITHDRAWAL_SETTLED")
      .map((payout) => ({
        id: payout.id,
        amount: Math.abs(Number(payout.amount ?? 0)),
        createdAt: payout.createdAt.toISOString(),
        userId: payout.user?.id || "",
        userName: payout.user?.name || "",
        userEmail: payout.user?.email || "",
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const filteredReceivedRows =
      selectedChannel === "ALL"
        ? allReceivedRows
        : allReceivedRows.filter((row) => row.channel === selectedChannel);

    const filteredPayoutRows =
      selectedChannel === "ALL"
        ? payoutRows
        : payoutRows.filter((row) => row.channel === selectedChannel);

    const rows = [...filteredReceivedRows, ...filteredPayoutRows].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const receivedAmount = filteredReceivedRows.reduce(
      (sum, row) => sum + row.amount,
      0,
    );
    const paidOutAmount = filteredPayoutRows.reduce(
      (sum, row) => sum + row.amount,
      0,
    );

    const receivedViaPaypal = filteredReceivedRows
      .filter((row) => row.channel === "PAYPAL")
      .reduce((sum, row) => sum + row.amount, 0);
    const receivedViaShamCash = filteredReceivedRows
      .filter((row) => row.channel === "SHAMCASH")
      .reduce((sum, row) => sum + row.amount, 0);

    const paidOutViaPaypal = filteredPayoutRows
      .filter((row) => row.channel === "PAYPAL")
      .reduce((sum, row) => sum + row.amount, 0);
    const paidOutViaShamCash = filteredPayoutRows
      .filter((row) => row.channel === "SHAMCASH")
      .reduce((sum, row) => sum + row.amount, 0);
    const paidOutManualSettlements = filteredPayoutRows
      .filter((row) => row.channel === "MANUAL")
      .reduce((sum, row) => sum + row.amount, 0);

    const readyUserBalances = Number(usersAgg._sum.balance ?? 0);
    const pendingReferralEarnings = Number(
      usersAgg._sum.pendingReferralEarnings ?? 0,
    );
    const previousOwnerWithdrawalsTotal = Number(
      previousOwnerWithdrawalsAgg._sum.amount ?? 0,
    );
    const profitSummary = calculatePlatformProfitSummary({
      subscriptionRevenueTotal: receivedAmount,
      readyUserProfitsTotal: readyUserBalances,
      pendingUserProfitsTotal: pendingReferralEarnings,
      previousOwnerWithdrawalsTotal,
    });
    const pendingManualWithdrawalAmount = Number(
      pendingManualWithdrawalsAgg._sum.amount ?? 0,
    );
    const pendingManualWithdrawalCount = Number(
      pendingManualWithdrawalsAgg._count._all ?? 0,
    );

    const inflowByChannel = buildBreakdown(filteredReceivedRows);
    const outflowByChannel = buildBreakdown(filteredPayoutRows);
    const subscriptionMethodBreakdown = buildSubscriptionMethodBreakdown(
      filteredReceivedRows.map((row) => ({
        method: row.subscriptionMethod,
        amount: row.amount,
      })),
    );

    const monthBuckets = new Map<
      string,
      {
        monthKey: string;
        receivedAmount: number;
        paidOutAmount: number;
        receivedCount: number;
        paidOutCount: number;
        netProfitAmount: number;
      }
    >();

    for (const row of rows) {
      const date = new Date(row.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthBuckets.get(monthKey) || {
        monthKey,
        receivedAmount: 0,
        paidOutAmount: 0,
        receivedCount: 0,
        paidOutCount: 0,
        netProfitAmount: 0,
      };

      if (row.kind === "RECEIVED") {
        existing.receivedAmount += row.amount;
        existing.receivedCount += 1;
      } else {
        existing.paidOutAmount += row.amount;
        existing.paidOutCount += 1;
      }

      monthBuckets.set(monthKey, existing);
    }

    for (const entry of profitLedgerInRange) {
      const monthKey = `${entry.createdAt.getFullYear()}-${String(entry.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthBuckets.get(monthKey) || {
        monthKey,
        receivedAmount: 0,
        paidOutAmount: 0,
        receivedCount: 0,
        paidOutCount: 0,
        netProfitAmount: 0,
      };

      existing.netProfitAmount += Number(entry.amount ?? 0);
      monthBuckets.set(monthKey, existing);
    }

    const monthlyTrend = Array.from(monthBuckets.values())
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((entry) => ({
        ...entry,
        netProfitAmount: Number(entry.netProfitAmount.toFixed(2)),
      }));

    const profitLedgerBreakdownMap = new Map<
      string,
      ProfitLedgerBreakdownRow
    >();

    for (const entry of profitLedgerInRange) {
      const existing = profitLedgerBreakdownMap.get(entry.type) || {
        type: entry.type,
        amount: 0,
        count: 0,
      };

      existing.amount += Number(entry.amount ?? 0);
      existing.count += 1;
      profitLedgerBreakdownMap.set(entry.type, existing);
    }

    const profitLedgerBreakdown = Array.from(profitLedgerBreakdownMap.values())
      .map((entry) => ({
        ...entry,
        amount: Number(entry.amount.toFixed(2)),
      }))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    const recentProfitLedgerEntries: ProfitLedgerEntryRow[] =
      profitLedgerInRange.slice(0, 30).map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: Number(entry.amount ?? 0),
        createdAt: entry.createdAt.toISOString(),
        referenceId: entry.referenceId || "",
        note: entry.note || "",
        userId: entry.user?.id || "",
        userName: entry.user?.name || "",
        userEmail: entry.user?.email || "",
      }));

    const todayReceivedAmount = rows
      .filter(
        (row) =>
          row.kind === "RECEIVED" &&
          isWithinRange(row.createdAt, todayStart, todayEnd),
      )
      .reduce((sum, row) => sum + row.amount, 0);
    const todayPaidOutAmount = rows
      .filter(
        (row) =>
          row.kind === "PAID_OUT" &&
          isWithinRange(row.createdAt, todayStart, todayEnd),
      )
      .reduce((sum, row) => sum + row.amount, 0);

    const weekReceivedAmount = rows
      .filter(
        (row) =>
          row.kind === "RECEIVED" &&
          isWithinRange(row.createdAt, weekStart, weekEnd),
      )
      .reduce((sum, row) => sum + row.amount, 0);
    const weekPaidOutAmount = rows
      .filter(
        (row) =>
          row.kind === "PAID_OUT" &&
          isWithinRange(row.createdAt, weekStart, weekEnd),
      )
      .reduce((sum, row) => sum + row.amount, 0);

    const allReceivedByMethod = new Map(
      allReceivedByMethodAgg.map((entry) => [
        entry.method,
        Number(entry._sum.amount ?? 0),
      ]),
    );

    const allReceivedViaPaypal = Number(allReceivedByMethod.get("PAYPAL") ?? 0);
    const allReceivedViaShamCash = Number(
      allReceivedByMethod.get("SHAMCASH") ?? 0,
    );

    const allPaidOutViaPaypal = Math.abs(
      Number(paidOutPaypalAgg._sum.amount ?? 0),
    );
    const allPaidOutViaShamCash = Math.abs(
      Number(paidOutShamCashAgg._sum.amount ?? 0),
    );

    return NextResponse.json(
      {
        range: {
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
        },
        filters: {
          channel: selectedChannel,
        },
        summary: {
          receivedAmount,
          paidOutAmount,
          netProfitAmount: profitSummary.netProfit,
          todayReceivedAmount,
          todayPaidOutAmount,
          todayNetProfitAmount: Number(todayProfitAgg._sum.amount ?? 0),
          weekReceivedAmount,
          weekPaidOutAmount,
          weekNetProfitAmount: Number(weekProfitAgg._sum.amount ?? 0),
          receivedViaPaypal,
          receivedViaShamCash,
          paidOutViaPaypal,
          paidOutViaShamCash,
          paidOutManualSettlements,
          readyUserBalances,
          pendingReferralEarnings,
          totalLiveUserLiabilities: profitSummary.totalLiveUserLiabilities,
          operatingReserveAmount: profitSummary.operatingReserve,
          previousOwnerWithdrawalsTotal:
            profitSummary.previousOwnerWithdrawalsTotal,
          availableToWithdraw: profitSummary.availableToWithdraw,
          totalSubscribers,
          activeSubscribers,
          pendingManualWithdrawalAmount,
          pendingManualWithdrawalCount,
        },
        walletEstimates: {
          paypal: allReceivedViaPaypal - allPaidOutViaPaypal,
          shamCash: allReceivedViaShamCash - allPaidOutViaShamCash,
        },
        breakdowns: {
          inflowByChannel,
          outflowByChannel,
          subscriptionMethodBreakdown,
          profitLedgerBreakdown,
        },
        monthlyTrend,
        adminWithdrawals,
        recentProfitLedgerEntries,
        rows,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load financial report";

    return NextResponse.json(
      { message: localizeErrorMessage(message, isArabic) },
      { status: 401 },
    );
  }
}
