import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PAYMENT_SETTINGS_SINGLETON_ID = 1;

const DEFAULT_SUBSCRIPTION_MONTHLY_PRICE = 30;
const DEFAULT_FEATURED_AD_MONTHLY_PRICE = 10;

const normalizeMoney = (value: Prisma.Decimal | number | string): number => {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    return 0;
  }

  return Number(asNumber.toFixed(2));
};

const cleanOptionalText = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }

  return value.trim();
};

type PaymentSettingsClient = {
  appPaymentSettings: {
    upsert: (args: Prisma.AppPaymentSettingsUpsertArgs) => Promise<{
      subscriptionMonthlyPrice: Prisma.Decimal;
      featuredAdMonthlyPrice: Prisma.Decimal;
      shamCashWalletCode: string | null;
      shamCashQrCodeUrl: string | null;
    }>;
  };
};

export interface PublicPaymentSettings {
  subscriptionMonthlyPrice: number;
  featuredAdMonthlyPrice: number;
  shamCashWalletCode: string;
  shamCashQrCodeUrl: string;
}

const mapToPublicSettings = (row: {
  subscriptionMonthlyPrice: Prisma.Decimal;
  featuredAdMonthlyPrice: Prisma.Decimal;
  shamCashWalletCode: string | null;
  shamCashQrCodeUrl: string | null;
}): PublicPaymentSettings => ({
  subscriptionMonthlyPrice:
    normalizeMoney(row.subscriptionMonthlyPrice) ||
    DEFAULT_SUBSCRIPTION_MONTHLY_PRICE,
  featuredAdMonthlyPrice:
    normalizeMoney(row.featuredAdMonthlyPrice) ||
    DEFAULT_FEATURED_AD_MONTHLY_PRICE,
  shamCashWalletCode: cleanOptionalText(row.shamCashWalletCode),
  shamCashQrCodeUrl: cleanOptionalText(row.shamCashQrCodeUrl),
});

export const ensurePaymentSettings = async (
  client: PaymentSettingsClient = prisma,
): Promise<PublicPaymentSettings> => {
  const row = await client.appPaymentSettings.upsert({
    where: { id: PAYMENT_SETTINGS_SINGLETON_ID },
    update: {},
    create: {
      id: PAYMENT_SETTINGS_SINGLETON_ID,
      subscriptionMonthlyPrice: DEFAULT_SUBSCRIPTION_MONTHLY_PRICE,
      featuredAdMonthlyPrice: DEFAULT_FEATURED_AD_MONTHLY_PRICE,
    },
    select: {
      subscriptionMonthlyPrice: true,
      featuredAdMonthlyPrice: true,
      shamCashWalletCode: true,
      shamCashQrCodeUrl: true,
    },
  });

  return mapToPublicSettings(row);
};

export const getPublicPaymentSettings =
  async (): Promise<PublicPaymentSettings> => ensurePaymentSettings(prisma);

export const updatePaymentSettings = async (input: {
  subscriptionMonthlyPrice: number;
  featuredAdMonthlyPrice: number;
  shamCashWalletCode?: string;
  shamCashQrCodeUrl?: string;
}): Promise<PublicPaymentSettings> => {
  const row = await prisma.appPaymentSettings.upsert({
    where: { id: PAYMENT_SETTINGS_SINGLETON_ID },
    update: {
      subscriptionMonthlyPrice: input.subscriptionMonthlyPrice,
      featuredAdMonthlyPrice: input.featuredAdMonthlyPrice,
      shamCashWalletCode: cleanOptionalText(input.shamCashWalletCode) || null,
      shamCashQrCodeUrl: cleanOptionalText(input.shamCashQrCodeUrl) || null,
    },
    create: {
      id: PAYMENT_SETTINGS_SINGLETON_ID,
      subscriptionMonthlyPrice: input.subscriptionMonthlyPrice,
      featuredAdMonthlyPrice: input.featuredAdMonthlyPrice,
      shamCashWalletCode: cleanOptionalText(input.shamCashWalletCode) || null,
      shamCashQrCodeUrl: cleanOptionalText(input.shamCashQrCodeUrl) || null,
    },
    select: {
      subscriptionMonthlyPrice: true,
      featuredAdMonthlyPrice: true,
      shamCashWalletCode: true,
      shamCashQrCodeUrl: true,
    },
  });

  return mapToPublicSettings(row);
};

export const DEFAULT_PRICING = {
  subscriptionMonthlyPrice: DEFAULT_SUBSCRIPTION_MONTHLY_PRICE,
  featuredAdMonthlyPrice: DEFAULT_FEATURED_AD_MONTHLY_PRICE,
} as const;
