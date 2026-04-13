import { calculatePlatformProfitSummary } from "@/lib/platformProfitSummary";
import {
  adminDashboardRepository,
  PAYOUT_LOG_TYPES,
} from "@/server/repositories/admin-dashboard.repository";
import type {
  AdminDashboardMonthlyTimelineItem,
  AdminDashboardQueryDto,
  AdminDashboardResponse,
  DashboardUser,
} from "@/features/admin/dashboard/types";

const SUBSCRIPTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_WINDOW = 6;

const getMonthStart = (date: Date, monthOffset = 0) =>
  new Date(date.getFullYear(), date.getMonth() + monthOffset, 1, 0, 0, 0, 0);

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const createMonthWindows = (date: Date, count: number) =>
  Array.from({ length: count }, (_, index) => {
    const offset = index - (count - 1);
    const start = getMonthStart(date, offset);
    const end = getMonthStart(date, offset + 1);

    return {
      monthKey: getMonthKey(start),
      start,
      end,
    };
  });

const toMoney = (value: number) => Number(value.toFixed(2));

const buildUserStats = (
  users: Awaited<ReturnType<typeof adminDashboardRepository.getUsers>>,
  referrals: Awaited<
    ReturnType<typeof adminDashboardRepository.getReferralStats>
  >,
  invitedUsers: Awaited<
    ReturnType<typeof adminDashboardRepository.getInvitedUsers>
  >,
  completedPayments: Awaited<
    ReturnType<typeof adminDashboardRepository.getCompletedPaymentsForUsers>
  >,
  logsGrouped: Awaited<
    ReturnType<typeof adminDashboardRepository.getChargingLogGroups>
  >,
  lowEarningsThreshold: number,
) => {
  const invitedMap = new Map(invitedUsers.map((user) => [user.id, user]));
  const logMap = new Map(
    logsGrouped.map((log) => [
      log.userId,
      {
        count: log._count._all ?? 0,
        totalCharged: Number(log._sum.amount ?? 0),
      },
    ]),
  );
  const latestPaymentByUser = new Map<
    string,
    { method: string; amount: number; createdAt: Date }
  >();

  for (const payment of completedPayments) {
    if (!latestPaymentByUser.has(payment.payerId)) {
      latestPaymentByUser.set(payment.payerId, {
        method: payment.method,
        amount: Number(payment.amount ?? 0),
        createdAt: payment.createdAt,
      });
    }
  }

  const referralsByOwner = new Map<string, string[]>();
  for (const referral of referrals) {
    const current = referralsByOwner.get(referral.userId) ?? [];
    current.push(referral.newUser);
    referralsByOwner.set(referral.userId, current);
  }

  const now = Date.now();

  return users.map((user) => {
    const invited = referralsByOwner.get(user.id) ?? [];
    const activeInvitedCount = invited.filter((invitedId) => {
      const invitedUser = invitedMap.get(invitedId);
      return Boolean(
        invitedUser && invitedUser.isActive && !invitedUser.isDeleted,
      );
    }).length;
    const logInfo = logMap.get(user.id) ?? { count: 0, totalCharged: 0 };
    const latestPayment = latestPaymentByUser.get(user.id) ?? null;
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
        lowEarningsThreshold,
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
      isAdmin: user.isAdmin,
      isOwner: user.isOwner,
      isIdentityVerified: user.isIdentityVerified,
      isDeleted: user.isDeleted,
      createdAt: user.createdAt,
      activeUntil: user.activeUntil,
      activatedSince,
      activeForDays,
      balance: Number(user.balance ?? 0),
      pendingReferralEarnings: Number(user.pendingReferralEarnings ?? 0),
      totalPotentialBalance:
        Number(user.balance ?? 0) + Number(user.pendingReferralEarnings ?? 0),
      totalCharged: logInfo.totalCharged,
      rechargeCount: logInfo.count,
      subscriptionPaymentMethod: latestPayment?.method ?? null,
      latestPaymentAmount: latestPayment?.amount ?? null,
      latestPaymentCreatedAt: latestPayment?.createdAt ?? null,
      repeatedSubscription,
      invitedCount: invited.length,
      activeInvitedCount,
      daysToExpiry,
      expiringSoon: Boolean(
        user.isActive &&
        !user.isDeleted &&
        typeof daysToExpiry === "number" &&
        daysToExpiry >= 0 &&
        daysToExpiry <= 3,
      ),
      monthlyProfitPotential,
      renewalIncentiveCandidate,
      lowEarningsCandidate,
    };
  });
};

const toDashboardUser = (
  user: ReturnType<typeof buildUserStats>[number],
): DashboardUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  isActive: user.isActive,
  isAdmin: user.isAdmin,
  isOwner: user.isOwner,
  isIdentityVerified: user.isIdentityVerified,
  isDeleted: user.isDeleted,
  createdAt: user.createdAt.toISOString(),
  activeUntil: user.activeUntil?.toISOString() ?? null,
  activatedSince: user.activatedSince?.toISOString() ?? null,
  activeForDays: user.activeForDays,
  balance: user.balance,
  pendingReferralEarnings: user.pendingReferralEarnings,
  totalPotentialBalance: user.totalPotentialBalance,
  totalCharged: user.totalCharged,
  rechargeCount: user.rechargeCount,
  subscriptionPaymentMethod: user.subscriptionPaymentMethod,
  latestPaymentAmount: user.latestPaymentAmount,
  latestPaymentCreatedAt: user.latestPaymentCreatedAt?.toISOString() ?? null,
  invitedCount: user.invitedCount,
  activeInvitedCount: user.activeInvitedCount,
  repeatedSubscription: user.repeatedSubscription,
  daysToExpiry: user.daysToExpiry,
  expiringSoon: user.expiringSoon,
  monthlyProfitPotential: user.monthlyProfitPotential,
  renewalIncentiveCandidate: user.renewalIncentiveCandidate,
  lowEarningsCandidate: user.lowEarningsCandidate,
});

const buildMonthlyTimeline = (
  monthWindows: ReturnType<typeof createMonthWindows>,
  timelinePayments: Awaited<
    ReturnType<typeof adminDashboardRepository.getTimelineData>
  >[0],
  timelineLogs: Awaited<
    ReturnType<typeof adminDashboardRepository.getTimelineData>
  >[1],
  timelinePlatformProfit: Awaited<
    ReturnType<typeof adminDashboardRepository.getTimelineData>
  >[2],
  timelineUsers: Awaited<
    ReturnType<typeof adminDashboardRepository.getTimelineData>
  >[3],
): AdminDashboardMonthlyTimelineItem[] => {
  const monthlyTimelineMap = new Map(
    monthWindows.map((window) => [
      window.monthKey,
      {
        monthKey: window.monthKey,
        receivedAmount: 0,
        paidOutAmount: 0,
        platformEarnings: 0,
        programEarnings: 0,
        newSubscribers: 0,
        netProfitAmount: 0,
      },
    ]),
  );

  for (const payment of timelinePayments) {
    const entry = monthlyTimelineMap.get(getMonthKey(payment.createdAt));
    if (entry) {
      entry.receivedAmount += Number(payment.amount ?? 0);
    }
  }

  for (const log of timelineLogs) {
    const entry = monthlyTimelineMap.get(getMonthKey(log.createdAt));
    if (!entry) continue;
    const amount = Number(log.amount ?? 0);
    entry.programEarnings += amount;
    if (
      PAYOUT_LOG_TYPES.includes(log.type as (typeof PAYOUT_LOG_TYPES)[number])
    ) {
      entry.paidOutAmount += Math.abs(amount);
    }
  }

  for (const entry of timelinePlatformProfit) {
    const monthEntry = monthlyTimelineMap.get(getMonthKey(entry.createdAt));
    if (monthEntry) {
      monthEntry.platformEarnings += Number(entry.amount ?? 0);
    }
  }

  for (const user of timelineUsers) {
    const monthEntry = monthlyTimelineMap.get(getMonthKey(user.createdAt));
    if (monthEntry) {
      monthEntry.newSubscribers += 1;
    }
  }

  return monthWindows.map((window) => {
    const entry = monthlyTimelineMap.get(window.monthKey)!;
    return {
      ...entry,
      receivedAmount: toMoney(entry.receivedAmount),
      paidOutAmount: toMoney(entry.paidOutAmount),
      platformEarnings: toMoney(entry.platformEarnings),
      programEarnings: toMoney(entry.programEarnings),
      netProfitAmount: toMoney(entry.platformEarnings),
    };
  });
};

export async function getAdminDashboard(
  query: AdminDashboardQueryDto,
): Promise<AdminDashboardResponse> {
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
  const monthWindows = createMonthWindows(nowDate, MONTH_WINDOW);
  const timelineStart = monthWindows[0]?.start ?? startOfMonth;

  const users = await adminDashboardRepository.getUsers();
  const userIds = users.map((user) => user.id);
  const [referrals, completedPayments, logsGrouped] = await Promise.all([
    adminDashboardRepository.getReferralStats(userIds),
    adminDashboardRepository.getCompletedPaymentsForUsers(userIds),
    adminDashboardRepository.getChargingLogGroups(),
  ]);
  const invitedIds = Array.from(new Set(referrals.map((row) => row.newUser)));
  const invitedUsers =
    await adminDashboardRepository.getInvitedUsers(invitedIds);

  const userStats = buildUserStats(
    users,
    referrals,
    invitedUsers,
    completedPayments,
    logsGrouped,
    query.lowEarningsThreshold,
  );

  const searchTerm = query.search.toLowerCase();
  const filteredUsers = userStats.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm);
    const matchesStatus =
      query.status === "ALL" ||
      (query.status === "ACTIVE" && user.isActive && !user.isDeleted) ||
      (query.status === "INACTIVE" && !user.isActive && !user.isDeleted) ||
      (query.status === "BLOCKED" && user.isDeleted);
    const matchesRepeat =
      query.repeat === "ALL" ||
      (query.repeat === "YES" && user.repeatedSubscription) ||
      (query.repeat === "NO" && !user.repeatedSubscription);

    return matchesSearch && matchesStatus && matchesRepeat;
  });

  filteredUsers.sort((left, right) => {
    const statusRank = (user: (typeof filteredUsers)[number]) => {
      if (user.isDeleted) return 0;
      if (user.isActive) return 2;
      return 1;
    };

    let leftValue: string | number;
    let rightValue: string | number;
    switch (query.sortBy) {
      case "status":
        leftValue = statusRank(left);
        rightValue = statusRank(right);
        break;
      case "balance":
        leftValue = left.totalPotentialBalance;
        rightValue = right.totalPotentialBalance;
        break;
      case "activeInvitedCount":
        leftValue = left.activeInvitedCount;
        rightValue = right.activeInvitedCount;
        break;
      case "rechargeCount":
        leftValue = left.rechargeCount;
        rightValue = right.rechargeCount;
        break;
      case "activeForDays":
        leftValue = left.activeForDays;
        rightValue = right.activeForDays;
        break;
      case "name":
      default:
        leftValue = left.name.toLowerCase();
        rightValue = right.name.toLowerCase();
        break;
    }

    if (leftValue < rightValue) return query.sortDirection === "asc" ? -1 : 1;
    if (leftValue > rightValue) return query.sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
  const currentPage = Math.min(query.page, totalPages);
  const pageStart = (currentPage - 1) * query.pageSize;
  const pagedUsers = filteredUsers.slice(pageStart, pageStart + query.pageSize);

  const totalSubscribers = users.filter((user) => !user.isDeleted).length;
  const totalUsers = users.length;
  const activeSubscribers = users.filter(
    (user) => !user.isDeleted && user.isActive,
  ).length;
  const inactiveUsers = users.filter(
    (user) => !user.isDeleted && !user.isActive,
  ).length;
  const blockedUsers = users.filter((user) => user.isDeleted).length;
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
    previousOwnerWithdrawalsAgg,
    platformProfitTotalAgg,
    platformProfitTodayAgg,
    platformProfitMonthAgg,
  ] = await adminDashboardRepository.getOverviewAggregates(
    startOfToday,
    startOfMonth,
  );

  const programEarningsTotal = Number(programEarningsTotalAgg._sum.amount ?? 0);
  const programEarningsToday = Number(programEarningsTodayAgg._sum.amount ?? 0);
  const programEarningsMonth = Number(programEarningsMonthAgg._sum.amount ?? 0);
  const receivedAmountTotal = Number(receivedTotalAgg._sum.amount ?? 0);
  const receivedAmountToday = Number(receivedTodayAgg._sum.amount ?? 0);
  const receivedAmountMonth = Number(receivedMonthAgg._sum.amount ?? 0);
  const previousOwnerWithdrawalsTotal = Number(
    previousOwnerWithdrawalsAgg._sum.amount ?? 0,
  );
  const profitSummary = calculatePlatformProfitSummary({
    subscriptionRevenueTotal: receivedAmountTotal,
    readyUserProfitsTotal: totalUserBalances,
    pendingUserProfitsTotal: totalPendingReferralEarnings,
    previousOwnerWithdrawalsTotal,
  });
  const platformEarningsTotal = Number(platformProfitTotalAgg._sum.amount ?? 0);
  const platformEarningsToday = Number(platformProfitTodayAgg._sum.amount ?? 0);
  const platformEarningsMonth = Number(platformProfitMonthAgg._sum.amount ?? 0);
  const receivedByMethod = new Map(
    receivedByMethodAgg.map((entry) => [
      entry.method,
      Number(entry._sum.amount ?? 0),
    ]),
  );
  const receivedViaPaypal = Number(receivedByMethod.get("PAYPAL") ?? 0);
  const receivedViaShamCash = Number(receivedByMethod.get("SHAMCASH") ?? 0);
  const paidOutAmountTotal = Math.abs(Number(paidOutTotalAgg._sum.amount ?? 0));
  const paidOutAmountToday = Math.abs(Number(paidOutTodayAgg._sum.amount ?? 0));
  const paidOutAmountMonth = Math.abs(Number(paidOutMonthAgg._sum.amount ?? 0));
  const paidOutViaPaypal = Math.abs(Number(paidOutPaypalAgg._sum.amount ?? 0));
  const paidOutViaShamCash = Math.abs(
    Number(paidOutShamCashAgg._sum.amount ?? 0),
  );
  const paidOutManualSettlements = Math.abs(
    Number(paidOutManualAgg._sum.amount ?? 0),
  );
  const paypalWalletEstimatedBalance = receivedViaPaypal - paidOutViaPaypal;
  const shamCashWalletEstimatedBalance =
    receivedViaShamCash - paidOutViaShamCash;

  let monthlyTimeline: AdminDashboardMonthlyTimelineItem[] | undefined;
  if (query.includeTimeline) {
    const [
      timelinePayments,
      timelineLogs,
      timelinePlatformProfit,
      timelineUsers,
    ] = await adminDashboardRepository.getTimelineData(timelineStart);
    monthlyTimeline = buildMonthlyTimeline(
      monthWindows,
      timelinePayments,
      timelineLogs,
      timelinePlatformProfit,
      timelineUsers,
    );
  }

  let selectedUser;
  if (query.selectedUserId) {
    const matchedUser =
      userStats.find((entry) => entry.id === query.selectedUserId) ?? null;

    if (matchedUser) {
      const [
        properties,
        newCars,
        oldCars,
        otherItems,
        recentPayments,
        recentChargingLogs,
        recentNotifications,
        identityVerificationRequest,
        monthlyPayments,
        monthlyChargingLogs,
      ] = await adminDashboardRepository.getSelectedUserDetails(
        matchedUser.id,
        timelineStart,
      );

      const monthlyStatsMap = new Map(
        monthWindows.map((window) => [
          window.monthKey,
          {
            monthKey: window.monthKey,
            rechargeAmount: 0,
            rechargeCount: 0,
            rewardAmount: 0,
            withdrawalAmount: 0,
            netAmount: 0,
          },
        ]),
      );

      for (const payment of monthlyPayments) {
        const entry = monthlyStatsMap.get(getMonthKey(payment.createdAt));
        if (!entry) continue;
        entry.rechargeAmount += Number(payment.amount ?? 0);
        entry.rechargeCount += 1;
      }

      for (const log of monthlyChargingLogs) {
        const entry = monthlyStatsMap.get(getMonthKey(log.createdAt));
        if (!entry) continue;
        const amount = Number(log.amount ?? 0);
        if (
          PAYOUT_LOG_TYPES.includes(
            log.type as (typeof PAYOUT_LOG_TYPES)[number],
          )
        ) {
          entry.withdrawalAmount += Math.abs(amount);
        } else if (amount > 0) {
          entry.rewardAmount += amount;
        }
      }

      selectedUser = {
        profile: toDashboardUser(matchedUser),
        listingSummary: {
          properties,
          newCars,
          oldCars,
          otherItems,
          totalActive: properties + newCars + oldCars + otherItems,
        },
        recentPayments: recentPayments.map((payment) => ({
          ...payment,
          amount: Number(payment.amount ?? 0),
          createdAt: payment.createdAt.toISOString(),
        })),
        recentChargingLogs: recentChargingLogs.map((log) => ({
          ...log,
          amount: Number(log.amount ?? 0),
          createdAt: log.createdAt.toISOString(),
        })),
        recentNotifications: recentNotifications.map((notification) => ({
          ...notification,
          type: String(notification.type),
          createdAt: notification.createdAt.toISOString(),
        })),
        identityVerificationRequest: identityVerificationRequest
          ? {
              ...identityVerificationRequest,
              status: String(identityVerificationRequest.status),
              createdAt: identityVerificationRequest.createdAt.toISOString(),
              reviewedAt:
                identityVerificationRequest.reviewedAt?.toISOString() ?? null,
            }
          : null,
        monthlyStats: monthWindows.map((window) => {
          const entry = monthlyStatsMap.get(window.monthKey)!;
          return {
            ...entry,
            rechargeAmount: toMoney(entry.rechargeAmount),
            rewardAmount: toMoney(entry.rewardAmount),
            withdrawalAmount: toMoney(entry.withdrawalAmount),
            netAmount: toMoney(
              entry.rechargeAmount +
                entry.rewardAmount -
                entry.withdrawalAmount,
            ),
          };
        }),
      };
    } else {
      selectedUser = null;
    }
  }

  return {
    overview: {
      totalUsers,
      totalSubscribers,
      paidSubscribers: activeSubscribers,
      activeSubscribers,
      repeatedSubscribers,
      statusDistribution: {
        active: activeSubscribers,
        inactive: inactiveUsers,
        blocked: blockedUsers,
      },
      totalPendingReferralEarnings: toMoney(totalPendingReferralEarnings),
      totalUserBalances: toMoney(totalUserBalances),
      totalLiveUserLiabilities: profitSummary.totalLiveUserLiabilities,
      operatingReserveAmount: profitSummary.operatingReserve,
      previousOwnerWithdrawalsTotal:
        profitSummary.previousOwnerWithdrawalsTotal,
      availableToWithdraw: profitSummary.availableToWithdraw,
      monthlyProfitPotentialUsers,
      renewalIncentiveCandidates,
      lowEarningCandidates,
      lowEarningsThreshold: query.lowEarningsThreshold,
      platformEarningsTotal: toMoney(platformEarningsTotal),
      platformEarningsToday: toMoney(platformEarningsToday),
      platformEarningsMonth: toMoney(platformEarningsMonth),
      programEarningsTotal: toMoney(programEarningsTotal),
      programEarningsToday: toMoney(programEarningsToday),
      programEarningsMonth: toMoney(programEarningsMonth),
      receivedAmountTotal: toMoney(receivedAmountTotal),
      receivedAmountToday: toMoney(receivedAmountToday),
      receivedAmountMonth: toMoney(receivedAmountMonth),
      paidOutAmountTotal: toMoney(paidOutAmountTotal),
      paidOutAmountToday: toMoney(paidOutAmountToday),
      paidOutAmountMonth: toMoney(paidOutAmountMonth),
      netProfitAmount: profitSummary.netProfit,
      receivedViaPaypal: toMoney(receivedViaPaypal),
      receivedViaShamCash: toMoney(receivedViaShamCash),
      paidOutViaPaypal: toMoney(paidOutViaPaypal),
      paidOutViaShamCash: toMoney(paidOutViaShamCash),
      paidOutManualSettlements: toMoney(paidOutManualSettlements),
      paypalWalletEstimatedBalance: toMoney(paypalWalletEstimatedBalance),
      shamCashWalletEstimatedBalance: toMoney(shamCashWalletEstimatedBalance),
    },
    filters: {
      search: query.search,
      status: query.status,
      repeat: query.repeat,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    },
    pagination: {
      page: currentPage,
      pageSize: query.pageSize,
      totalItems,
      totalPages,
    },
    users: pagedUsers.map(toDashboardUser),
    ...(monthlyTimeline ? { monthlyTimeline } : {}),
    ...(query.selectedUserId ? { selectedUser: selectedUser ?? null } : {}),
  };
}
