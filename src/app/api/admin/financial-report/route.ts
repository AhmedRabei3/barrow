import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAbminUser } from "@/app/api/utils/authHelper";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

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

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    await requireAbminUser();

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

    const [
      paymentsInRange,
      payoutsInRange,
      allReceivedByMethodAgg,
      paidOutPaypalAgg,
      paidOutShamCashAgg,
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
    ]);

    const receivedRows = paymentsInRange.map((payment) => ({
      id: `payment-${payment.id}`,
      kind: "RECEIVED" as const,
      channel: resolvePaymentChannel(payment.method),
      amount: Number(payment.amount ?? 0),
      currency: payment.currency || "USD",
      createdAt: payment.createdAt.toISOString(),
      reference: payment.id,
      userId: payment.payer?.id || "",
      userName: payment.payer?.name || "",
      userEmail: payment.payer?.email || "",
    }));

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
        ? receivedRows
        : receivedRows.filter((row) => row.channel === selectedChannel);

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

    const todayStart = toStartOfDay(now);
    const todayEnd = toEndOfDay(now);
    const weekStart = toStartOfWeek(now);
    const weekEnd = todayEnd;

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
          netProfitAmount: receivedAmount - paidOutAmount,
          todayReceivedAmount,
          todayPaidOutAmount,
          todayNetProfitAmount: todayReceivedAmount - todayPaidOutAmount,
          weekReceivedAmount,
          weekPaidOutAmount,
          weekNetProfitAmount: weekReceivedAmount - weekPaidOutAmount,
          receivedViaPaypal,
          receivedViaShamCash,
          paidOutViaPaypal,
          paidOutViaShamCash,
          paidOutManualSettlements,
        },
        walletEstimates: {
          paypal: allReceivedViaPaypal - allPaidOutViaPaypal,
          shamCash: allReceivedViaShamCash - allPaidOutViaShamCash,
        },
        adminWithdrawals,
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
