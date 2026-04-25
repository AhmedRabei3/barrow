import { Prisma } from "@prisma/client";
import { getEligibleReferrerId } from "@/lib/referralBenefits";
import {
  recordPlatformProfitLedgerEntries,
  type PlatformProfitLedgerEntryInput,
} from "@/lib/platformProfitLedger";
import { PLATFORM_OPERATING_RESERVE_RATE } from "@/lib/platformProfitSummary";

const MS_DAY = 24 * 60 * 60 * 1000;
const SUBS_MS = 30 * MS_DAY;
const GRACE_MS = 15 * MS_DAY;

const getReferralRateByRank = (rank: number): number => {
  if (rank <= 0) return 0;
  if (rank <= 10) return 0.6;
  if (rank <= 20) return 0.4;
  if (rank <= 30) return 0.3;
  return 0.2;
};

export interface ApplySubscriptionActivationInput {
  tx: ActivationTransactionClient;
  userId: string;
  subscriptionAmount: number;
  sourceLabel: string;
  referralDiscountValue?: number;
}

export interface ApplySubscriptionActivationResult {
  newActiveUntil: Date;
}

type ActivationTransactionClient = {
  user: {
    findUnique: (args: Prisma.UserFindUniqueArgs) => Promise<{
      id?: string;
      isActive?: boolean;
      isDeleted?: boolean;
      activeUntil?: Date | null;
      pendingReferralEarnings?: Prisma.Decimal;
    } | null>;
    findMany: (args: Prisma.UserFindManyArgs) => Promise<Array<{ id: string }>>;
    update: (args: Prisma.UserUpdateArgs) => Promise<unknown>;
  };
  referral: {
    findFirst: (args: Prisma.ReferralFindFirstArgs) => Promise<{
      userId: string;
    } | null>;
    findMany: (args: Prisma.ReferralFindManyArgs) => Promise<
      Array<{
        id: string;
        newUser: string;
      }>
    >;
  };
  platformBalance: {
    create: (args: Prisma.PlatformBalanceCreateArgs) => Promise<unknown>;
  };
  chargingLog: {
    create: (args: Prisma.ChargingLogCreateArgs) => Promise<unknown>;
  };
  notification: {
    create: (args: Prisma.NotificationCreateArgs) => Promise<unknown>;
  };
  platformProfitLedger: {
    create: (args: Prisma.PlatformProfitLedgerCreateArgs) => Promise<unknown>;
  };
};

export const applySubscriptionActivation = async (
  input: ApplySubscriptionActivationInput,
): Promise<ApplySubscriptionActivationResult> => {
  const {
    tx,
    userId,
    subscriptionAmount,
    sourceLabel,
    referralDiscountValue = 0,
  } = input;

  if (!Number.isFinite(subscriptionAmount) || subscriptionAmount <= 0) {
    throw new Error("Invalid subscription amount");
  }

  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const activatedUserId = user.id;
  if (!activatedUserId) {
    throw new Error("User not found");
  }

  const now = new Date();
  const activeUntil = user.activeUntil ? new Date(user.activeUntil) : null;
  const isFirstActivation = !activeUntil;

  if (activeUntil && now < activeUntil) {
    throw new Error("Renewal is only allowed during the grace period");
  }

  let newActiveUntil: Date;
  let losePendingEarnings = false;

  if (!activeUntil) {
    newActiveUntil = new Date(now.getTime() + SUBS_MS);
  } else {
    const expiredMs = now.getTime() - activeUntil.getTime();

    if (expiredMs <= GRACE_MS) {
      newActiveUntil = new Date(now.getTime() + SUBS_MS);
    } else {
      losePendingEarnings = true;
      newActiveUntil = new Date(now.getTime() + SUBS_MS);
    }
  }

  const pendingEarnings = Number(user.pendingReferralEarnings) || 0;
  let referrerShare = 0;

  const referrerId = await getEligibleReferrerId(tx, activatedUserId);

  if (referrerId) {
    const referrerReferrals = await tx.referral.findMany({
      where: { userId: referrerId },
      select: { id: true, newUser: true },
      orderBy: { id: "asc" },
    });

    const invitedUserIds = referrerReferrals.map((row) => row.newUser);
    const activeInvitedUsers = invitedUserIds.length
      ? await tx.user.findMany({
          where: {
            id: { in: invitedUserIds },
            isActive: true,
            isDeleted: false,
          },
          select: { id: true },
        })
      : [];

    const activeInvitedIds = activeInvitedUsers.map((row) => row.id);
    const effectiveActiveInvitedIds = Array.from(
      new Set([...activeInvitedIds, activatedUserId]),
    );
    const activeInvitedSet = new Set(effectiveActiveInvitedIds);

    const rankedEligibleInvitedIds = referrerReferrals
      .filter((row) => activeInvitedSet.has(row.newUser))
      .map((row) => row.newUser);

    const currentUserRank =
      rankedEligibleInvitedIds.indexOf(activatedUserId) + 1;
    const referralRate = getReferralRateByRank(currentUserRank);

    referrerShare = subscriptionAmount * referralRate;
  }

  const platformShare = subscriptionAmount - referrerShare;
  const operatingReserveAmount =
    subscriptionAmount * PLATFORM_OPERATING_RESERVE_RATE;

  await tx.chargingLog.create({
    data: {
      userId: activatedUserId,
      type: "SUBSCRIPTION_REVENUE",
      amount: subscriptionAmount,
    },
  });

  await tx.user.update({
    where: { id: activatedUserId },
    data: {
      isActive: true,
      activeUntil: newActiveUntil,
      balance: losePendingEarnings
        ? undefined
        : { increment: pendingEarnings + referralDiscountValue },
      pendingReferralEarnings: 0,
    },
  });

  await tx.platformBalance.create({
    data: { amount: platformShare, transactionId: null },
  });

  if (losePendingEarnings && pendingEarnings > 0) {
    await tx.platformBalance.create({
      data: { amount: pendingEarnings, transactionId: null },
    });

    await tx.notification.create({
      data: {
        userId: activatedUserId,
        title: "⚠️ فقدت أرباحك المعلقة",
        message: "لم يتم تجديد اشتراكك خلال فترة السماح (15 يوم).",
      },
    });
  }

  if (referrerId && referrerShare > 0) {
    await tx.user.update({
      where: { id: referrerId },
      data: {
        pendingReferralEarnings: { increment: referrerShare },
      },
    });

    await tx.notification.create({
      data: {
        userId: referrerId,
        title: "💰 أرباح إحالة معلقة",
        message: `لديك ${referrerShare.toFixed(2)}$ أرباح معلقة حتى تجديد اشتراكك.`,
      },
    });
  }

  if (referralDiscountValue > 0) {
    await tx.notification.create({
      data: {
        userId: activatedUserId,
        title: "🎁 خصم إحالة مُطبق",
        message: `تم تطبيق خصم إحالة 10% بقيمة ${referralDiscountValue.toFixed(2)}$ وإضافته إلى رصيدك كميزة ترحيبية.`,
      },
    });
  }

  const ledgerEntries = [
    {
      type: "SUBSCRIPTION_REVENUE",
      amount: subscriptionAmount,
      userId: activatedUserId,
      referenceId: activatedUserId,
      note: `${sourceLabel} subscription revenue`,
    },
    {
      type: "OPERATING_RESERVE",
      amount: -operatingReserveAmount,
      userId: activatedUserId,
      referenceId: activatedUserId,
      note: `${sourceLabel} operating reserve`,
    },
    referrerId && referrerShare > 0
      ? {
          type: "PENDING_REFERRAL_LIABILITY",
          amount: -referrerShare,
          userId: referrerId,
          referenceId: activatedUserId,
          note: `Pending referral earnings from ${sourceLabel} activation`,
        }
      : null,
    referralDiscountValue > 0
      ? {
          type: "READY_BALANCE_BONUS_LIABILITY",
          amount: -referralDiscountValue,
          userId: activatedUserId,
          referenceId: activatedUserId,
          note: `Referral discount credited on ${sourceLabel} activation`,
        }
      : null,
    losePendingEarnings && pendingEarnings > 0
      ? {
          type: "FORFEITED_PENDING_EARNINGS_RELEASE",
          amount: pendingEarnings,
          userId: activatedUserId,
          referenceId: activatedUserId,
          note: "Expired pending referral earnings returned to platform",
        }
      : null,
  ].filter(Boolean) as PlatformProfitLedgerEntryInput[];

  await recordPlatformProfitLedgerEntries(tx, ledgerEntries);

  await tx.notification.create({
    data: {
      userId: activatedUserId,
      title: isFirstActivation
        ? "🎉 مرحبًا بك في اشتراك Mashhoor"
        : `✅ تم تجديد الاشتراك عبر ${sourceLabel}`,
      message: isFirstActivation
        ? `تم تفعيل اشتراكك لأول مرة بنجاح حتى ${newActiveUntil.toISOString().slice(0, 10)}. يمكنك الآن النشر والاستفادة من برنامج الدعوات والأرباح.`
        : `تم تجديد اشتراكك بنجاح حتى ${newActiveUntil.toISOString().slice(0, 10)}.`,
    },
  });

  return { newActiveUntil };
};
