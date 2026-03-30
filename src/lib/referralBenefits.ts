import { Prisma } from "@prisma/client";

export const REFERRAL_DISCOUNT_RATE = 0.1;

type ReferralBenefitClient = {
  referral: {
    findFirst: (args: Prisma.ReferralFindFirstArgs) => Promise<{
      userId: string;
    } | null>;
  };
  user: {
    findUnique: (args: Prisma.UserFindUniqueArgs) => Promise<{
      id?: string;
      isActive?: boolean;
      isDeleted?: boolean;
      activeUntil?: Date | null;
    } | null>;
  };
};

export const getEligibleReferrerId = async (
  client: ReferralBenefitClient,
  invitedUserId: string,
): Promise<string | null> => {
  const referral = await client.referral.findFirst({
    where: { newUser: invitedUserId },
    select: { userId: true },
  });

  if (!referral?.userId) {
    return null;
  }

  const referrer = await client.user.findUnique({
    where: { id: referral.userId },
    select: {
      id: true,
      isActive: true,
      isDeleted: true,
    },
  });

  if (!referrer || referrer.isDeleted || !referrer.isActive) {
    return null;
  }

  return referrer.id ?? null;
};

export const getReferralDiscountValue = async (
  client: ReferralBenefitClient,
  invitedUserId: string,
  originalAmount: number,
): Promise<number> => {
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
    return 0;
  }

  const invitedUser = await client.user.findUnique({
    where: { id: invitedUserId },
    select: { activeUntil: true },
  });

  if (!invitedUser || invitedUser.activeUntil) {
    return 0;
  }

  const referrerId = await getEligibleReferrerId(client, invitedUserId);
  if (!referrerId) {
    return 0;
  }

  return Number((originalAmount * REFERRAL_DISCOUNT_RATE).toFixed(2));
};
