import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAbminUser } from "../../utils/authHelper";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

const SUBSCRIPTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LOW_EARNINGS_THRESHOLD = 20;
const PAYOUT_LOG_TYPES = [
  "PAYPAL_WITHDRAWAL",
  "SHAMCASH_API_WITHDRAWAL",
  "SHAMCASH_PLAYWRIGHT_WITHDRAWAL",
  "SHAMCASH_MANUAL_WITHDRAWAL",
  "MANUAL_WITHDRAWAL_SETTLED",
] as const;

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  try {
    await requireAbminUser();

    const nowDate = new Date();
    const startOfToday = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      nowDate.getDate(),
      0,
      0,
      0,
      0,
    );
    const startOfMonth = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    const lowEarningsThresholdParam = req.nextUrl.searchParams.get(
      "lowEarningsThreshold",
    );
    const lowEarningsThreshold = Number(lowEarningsThresholdParam);
    const effectiveLowEarningsThreshold =
      Number.isFinite(lowEarningsThreshold) && lowEarningsThreshold >= 0
        ? lowEarningsThreshold
        : DEFAULT_LOW_EARNINGS_THRESHOLD;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isDeleted: true,
        createdAt: true,
        activeUntil: true,
        balance: true,
        pendingReferralEarnings: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const userIds = users.map((user) => user.id);

    const referrals = await prisma.referral.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        newUser: true,
      },
    });

    const invitedIds = Array.from(new Set(referrals.map((row) => row.newUser)));
    const invitedUsers = invitedIds.length
      ? await prisma.user.findMany({
          where: { id: { in: invitedIds } },
          select: { id: true, isActive: true, isDeleted: true },
        })
      : [];

    const invitedMap = new Map(
      invitedUsers.map((invitedUser) => [invitedUser.id, invitedUser]),
    );

    const logsGrouped = await prisma.chargingLog.groupBy({
      by: ["userId"],
      _count: { _all: true },
      _sum: { amount: true },
    });

    const logMap = new Map(
      logsGrouped.map((log) => [
        log.userId,
        {
          count: log._count._all ?? 0,
          totalCharged: Number(log._sum.amount ?? 0),
        },
      ]),
    );

    const referralsByOwner = new Map<string, string[]>();
    for (const referral of referrals) {
      const current = referralsByOwner.get(referral.userId) ?? [];
      current.push(referral.newUser);
      referralsByOwner.set(referral.userId, current);
    }

    const now = Date.now();

    const userStats = users.map((user) => {
      const invited = referralsByOwner.get(user.id) ?? [];
      const activeInvitedCount = invited.filter((invitedId) => {
        const invitedUser = invitedMap.get(invitedId);
        return Boolean(
          invitedUser && invitedUser.isActive && !invitedUser.isDeleted,
        );
      }).length;

      const logInfo = logMap.get(user.id) ?? { count: 0, totalCharged: 0 };

      const activatedSince = user.activeUntil
        ? new Date(user.activeUntil.getTime() - SUBSCRIPTION_DAYS * DAY_MS)
        : null;

      const activeForDays = activatedSince
        ? Math.max(0, Math.floor((now - activatedSince.getTime()) / DAY_MS))
        : 0;

      const daysToExpiry = user.activeUntil
        ? Math.ceil((user.activeUntil.getTime() - now) / DAY_MS)
        : null;

      const repeatedSubscription = logInfo.count > 1;
      const lowEarningsCandidate = Boolean(
        !user.isDeleted &&
        Number(user.balance ?? 0) + Number(user.pendingReferralEarnings ?? 0) <=
          effectiveLowEarningsThreshold,
      );

      const monthlyProfitPotential = Boolean(
        user.isActive &&
        !user.isDeleted &&
        repeatedSubscription &&
        activeInvitedCount >= 1,
      );

      const renewalIncentiveCandidate = Boolean(
        user.isActive &&
        !user.isDeleted &&
        repeatedSubscription &&
        activeInvitedCount >= 1 &&
        typeof daysToExpiry === "number" &&
        daysToExpiry >= 0 &&
        daysToExpiry <= 7,
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        isDeleted: user.isDeleted,
        createdAt: user.createdAt,
        activeUntil: user.activeUntil,
        activatedSince,
        activeForDays,
        balance: Number(user.balance ?? 0),
        pendingReferralEarnings: Number(user.pendingReferralEarnings ?? 0),
        totalCharged: logInfo.totalCharged,
        rechargeCount: logInfo.count,
        repeatedSubscription,
        invitedCount: invited.length,
        activeInvitedCount,
        daysToExpiry,
        monthlyProfitPotential,
        renewalIncentiveCandidate,
        lowEarningsCandidate,
      };
    });

    const totalSubscribers = users.filter((user) => !user.isDeleted).length;
    const activeSubscribers = users.filter(
      (user) => !user.isDeleted && user.isActive,
    ).length;
    const repeatedSubscribers = userStats.filter(
      (entry) => entry.repeatedSubscription,
    ).length;

    const totalPendingReferralEarnings = userStats.reduce(
      (sum, entry) => sum + entry.pendingReferralEarnings,
      0,
    );

    const totalUserBalances = userStats.reduce(
      (sum, entry) => sum + entry.balance,
      0,
    );

    const monthlyProfitPotentialUsers = userStats.filter(
      (entry) => entry.monthlyProfitPotential,
    ).length;

    const renewalIncentiveCandidates = userStats.filter(
      (entry) => entry.renewalIncentiveCandidate,
    ).length;

    const lowEarningCandidates = userStats.filter(
      (entry) => entry.lowEarningsCandidate,
    ).length;

    const [
      platformEarningsTotalAgg,
      platformEarningsTodayAgg,
      platformEarningsMonthAgg,
      programEarningsTotalAgg,
      programEarningsTodayAgg,
      programEarningsMonthAgg,
      receivedTotalAgg,
      receivedTodayAgg,
      receivedMonthAgg,
      receivedByMethodAgg,
      paidOutTotalAgg,
      paidOutTodayAgg,
      paidOutMonthAgg,
      paidOutPaypalAgg,
      paidOutShamCashAgg,
      paidOutManualAgg,
    ] = await Promise.all([
      prisma.platformBalance.aggregate({
        _sum: { amount: true },
      }),
      prisma.platformBalance.aggregate({
        where: { createdAt: { gte: startOfToday } },
        _sum: { amount: true },
      }),
      prisma.platformBalance.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.chargingLog.aggregate({
        _sum: { amount: true },
      }),
      prisma.chargingLog.aggregate({
        where: { createdAt: { gte: startOfToday } },
        _sum: { amount: true },
      }),
      prisma.chargingLog.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED", createdAt: { gte: startOfToday } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED", createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ["method"],
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
      prisma.chargingLog.aggregate({
        where: { type: { in: [...PAYOUT_LOG_TYPES] } },
        _sum: { amount: true },
      }),
      prisma.chargingLog.aggregate({
        where: {
          type: { in: [...PAYOUT_LOG_TYPES] },
          createdAt: { gte: startOfToday },
        },
        _sum: { amount: true },
      }),
      prisma.chargingLog.aggregate({
        where: {
          type: { in: [...PAYOUT_LOG_TYPES] },
          createdAt: { gte: startOfMonth },
        },
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
      prisma.chargingLog.aggregate({
        where: { type: "MANUAL_WITHDRAWAL_SETTLED" },
        _sum: { amount: true },
      }),
    ]);

    const platformEarningsTotal = Number(
      platformEarningsTotalAgg._sum.amount ?? 0,
    );
    const platformEarningsToday = Number(
      platformEarningsTodayAgg._sum.amount ?? 0,
    );
    const platformEarningsMonth = Number(
      platformEarningsMonthAgg._sum.amount ?? 0,
    );

    const programEarningsTotal = Number(
      programEarningsTotalAgg._sum.amount ?? 0,
    );
    const programEarningsToday = Number(
      programEarningsTodayAgg._sum.amount ?? 0,
    );
    const programEarningsMonth = Number(
      programEarningsMonthAgg._sum.amount ?? 0,
    );

    const receivedAmountTotal = Number(receivedTotalAgg._sum.amount ?? 0);
    const receivedAmountToday = Number(receivedTodayAgg._sum.amount ?? 0);
    const receivedAmountMonth = Number(receivedMonthAgg._sum.amount ?? 0);

    const receivedByMethod = new Map(
      receivedByMethodAgg.map((entry) => [
        entry.method,
        Number(entry._sum.amount ?? 0),
      ]),
    );

    const receivedViaPaypal = Number(receivedByMethod.get("PAYPAL") ?? 0);
    const receivedViaShamCash = Number(receivedByMethod.get("SHAMCASH") ?? 0);

    const paidOutAmountTotal = Math.abs(
      Number(paidOutTotalAgg._sum.amount ?? 0),
    );
    const paidOutAmountToday = Math.abs(
      Number(paidOutTodayAgg._sum.amount ?? 0),
    );
    const paidOutAmountMonth = Math.abs(
      Number(paidOutMonthAgg._sum.amount ?? 0),
    );

    const paidOutViaPaypal = Math.abs(
      Number(paidOutPaypalAgg._sum.amount ?? 0),
    );
    const paidOutViaShamCash = Math.abs(
      Number(paidOutShamCashAgg._sum.amount ?? 0),
    );
    const paidOutManualSettlements = Math.abs(
      Number(paidOutManualAgg._sum.amount ?? 0),
    );

    const netProfitAmount = receivedAmountTotal - paidOutAmountTotal;
    const paypalWalletEstimatedBalance = receivedViaPaypal - paidOutViaPaypal;
    const shamCashWalletEstimatedBalance =
      receivedViaShamCash - paidOutViaShamCash;

    return NextResponse.json(
      {
        overview: {
          totalSubscribers,
          activeSubscribers,
          repeatedSubscribers,
          totalPendingReferralEarnings,
          totalUserBalances,
          monthlyProfitPotentialUsers,
          renewalIncentiveCandidates,
          lowEarningCandidates,
          lowEarningsThreshold: effectiveLowEarningsThreshold,
          platformEarningsTotal,
          platformEarningsToday,
          platformEarningsMonth,
          programEarningsTotal,
          programEarningsToday,
          programEarningsMonth,
          receivedAmountTotal,
          receivedAmountToday,
          receivedAmountMonth,
          paidOutAmountTotal,
          paidOutAmountToday,
          paidOutAmountMonth,
          netProfitAmount,
          receivedViaPaypal,
          receivedViaShamCash,
          paidOutViaPaypal,
          paidOutViaShamCash,
          paidOutManualSettlements,
          paypalWalletEstimatedBalance,
          shamCashWalletEstimatedBalance,
        },
        users: userStats,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { message: localizeErrorMessage("Unauthorized", isArabic) },
      { status: 401 },
    );
  }
}
