import { Prisma } from "@prisma/client";
import { getEligibleReferrerId } from "@/lib/referralBenefits";

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
  notification: {
    create: (args: Prisma.NotificationCreateArgs) => Promise<unknown>;
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

  await tx.notification.create({
    data: {
      userId: activatedUserId,
      title: `✅ تم تجديد الاشتراك عبر ${sourceLabel}`,
      message: `تم تفعيل حسابك حتى ${newActiveUntil.toISOString().slice(0, 10)}.`,
    },
  });

  return { newActiveUntil };
};
