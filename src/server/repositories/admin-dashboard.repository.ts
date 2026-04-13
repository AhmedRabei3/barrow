import { prisma } from "@/lib/prisma";

export const PAYOUT_LOG_TYPES = [
  "PAYPAL_WITHDRAWAL",
  "SHAMCASH_API_WITHDRAWAL",
  "SHAMCASH_PLAYWRIGHT_WITHDRAWAL",
  "SHAMCASH_MANUAL_WITHDRAWAL",
  "MANUAL_WITHDRAWAL_SETTLED",
] as const;

export const adminDashboardRepository = {
  getUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isAdmin: true,
        isOwner: true,
        isIdentityVerified: true,
        isDeleted: true,
        createdAt: true,
        activeUntil: true,
        balance: true,
        pendingReferralEarnings: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  getReferralStats(userIds: string[]) {
    return prisma.referral.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        newUser: true,
      },
    });
  },

  getCompletedPaymentsForUsers(userIds: string[]) {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }

    return prisma.payment.findMany({
      where: {
        payerId: { in: userIds },
        status: "COMPLETED",
      },
      orderBy: { createdAt: "desc" },
      select: {
        payerId: true,
        method: true,
        amount: true,
        createdAt: true,
      },
    });
  },

  getChargingLogGroups() {
    return prisma.chargingLog.groupBy({
      by: ["userId"],
      _count: { _all: true },
      _sum: { amount: true },
    });
  },

  getInvitedUsers(invitedIds: string[]) {
    if (invitedIds.length === 0) {
      return Promise.resolve([]);
    }

    return prisma.user.findMany({
      where: { id: { in: invitedIds } },
      select: { id: true, isActive: true, isDeleted: true },
    });
  },

  getOverviewAggregates(startOfToday: Date, startOfMonth: Date) {
    return Promise.all([
      prisma.chargingLog.aggregate({ _sum: { amount: true } }),
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
      prisma.ownerProfitWithdrawal.aggregate({ _sum: { amount: true } }),
      prisma.platformProfitLedger.aggregate({ _sum: { amount: true } }),
      prisma.platformProfitLedger.aggregate({
        where: { createdAt: { gte: startOfToday } },
        _sum: { amount: true },
      }),
      prisma.platformProfitLedger.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
    ]);
  },

  getTimelineData(timelineStart: Date) {
    return Promise.all([
      prisma.payment.findMany({
        where: {
          status: "COMPLETED",
          createdAt: { gte: timelineStart },
        },
        select: {
          amount: true,
          createdAt: true,
        },
      }),
      prisma.chargingLog.findMany({
        where: { createdAt: { gte: timelineStart } },
        select: {
          amount: true,
          type: true,
          createdAt: true,
        },
      }),
      prisma.platformProfitLedger.findMany({
        where: { createdAt: { gte: timelineStart } },
        select: {
          amount: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        where: {
          isDeleted: false,
          createdAt: { gte: timelineStart },
        },
        select: {
          createdAt: true,
        },
      }),
    ]);
  },

  getSelectedUserDetails(userId: string, timelineStart: Date) {
    return Promise.all([
      prisma.property.count({ where: { ownerId: userId, isDeleted: false } }),
      prisma.newCar.count({ where: { ownerId: userId, isDeleted: false } }),
      prisma.oldCar.count({ where: { ownerId: userId, isDeleted: false } }),
      prisma.otherItem.count({ where: { ownerId: userId, isDeleted: false } }),
      prisma.payment.findMany({
        where: { payerId: userId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.chargingLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          type: true,
          amount: true,
          createdAt: true,
        },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          type: true,
          isRead: true,
          createdAt: true,
        },
      }),
      prisma.identityVerificationRequest.findUnique({
        where: { userId },
        select: {
          id: true,
          status: true,
          fullName: true,
          nationalId: true,
          frontImageUrl: true,
          backImageUrl: true,
          adminNote: true,
          createdAt: true,
          reviewedAt: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          payerId: userId,
          status: "COMPLETED",
          createdAt: { gte: timelineStart },
        },
        select: {
          amount: true,
          createdAt: true,
        },
      }),
      prisma.chargingLog.findMany({
        where: {
          userId,
          createdAt: { gte: timelineStart },
        },
        select: {
          amount: true,
          type: true,
          createdAt: true,
        },
      }),
    ]);
  },
};
