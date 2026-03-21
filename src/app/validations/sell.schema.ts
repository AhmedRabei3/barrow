import { z } from "zod";
import { TransactionType } from "@prisma/client";
import { baseTransactionSchema } from "./transaction.base";

export const sellSchema = z.object({
  ...baseTransactionSchema,
  type: z.literal(TransactionType.SELL),
});
