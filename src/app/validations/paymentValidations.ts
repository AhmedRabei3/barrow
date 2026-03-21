import { z } from "zod";

export const createPaymentSchema = z.object({
  transactionId: z.string().cuid(),
  amount: z.number().positive(),
  currency: z.string().optional(),
  method: z.enum([
    "PAYPAL",
    "CARD",
    "CRYPTO",
    "SHAMCASH",
    "BALANCE",
    "BANK_TRANSFER",
  ]),
  status: z
    .enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"])
    .default("PENDING"),

  userId: z.string().cuid(),
});

export const updatePaymentSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),

  amount: z.number().positive().optional(),
});

export const deletePaymentSchema = z.object({
  id: z.string().cuid(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type DeletePaymentInput = z.infer<typeof deletePaymentSchema>;
