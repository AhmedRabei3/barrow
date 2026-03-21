import { z } from "zod";
import { ItemType, TransactionType } from "@prisma/client";

export const baseTransactionSchema = {
  itemId: z.string().cuid("معرّف العنصر غير صالح"),
  itemType: z.nativeEnum(ItemType),
  type: z.nativeEnum(TransactionType),
};
