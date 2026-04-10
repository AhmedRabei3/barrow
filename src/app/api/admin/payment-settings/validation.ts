import { z } from "zod";

export const paymentSettingsSchema = z.object({
  subscriptionMonthlyPrice: z.number().positive(),
  featuredAdMonthlyPrice: z.number().positive(),
  url: z.string().optional().nullable(),
  publicId: z.string().optional().nullable(),
  adminSettingsPassword: z.string().min(6).optional(),
  paymentResetEmail: z.string().email().optional().nullable(),
  ownerProfitWalletCode: z.string().trim().min(3).optional().nullable(),
});

export const updatePaymentSettingsSchema = z.object({
  subscriptionMonthlyPrice: z.number().positive().optional(),
  featuredAdMonthlyPrice: z.number().positive().optional(),
  url: z.string().optional(),
  publicId: z.string().optional(),
  adminSettingsPassword: z.string().min(6).optional(),
  paymentResetEmail: z.string().email().optional(),
  ownerProfitWalletCode: z.string().trim().min(3).optional().nullable(),
});

export const passwordSchema = z.object({
  password: z.string().min(6),
});

export type UpdatePaymentSettings = z.infer<typeof updatePaymentSettingsSchema>;
