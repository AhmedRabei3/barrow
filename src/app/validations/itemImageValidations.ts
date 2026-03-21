import { z } from "zod";

export const createItemImageSchema = z.object({
  itemId: z.string().cuid("معرف العنصر غير صالح"),
  url: z.string().url("رابط الصورة غير صالح"),
});

export const updateItemImageSchema = z.object({
  url: z.string().url("رابط الصورة غير صالح").optional(),
});

export const deleteItemImageSchema = z.object({
  id: z.string().cuid("معرف الصورة غير صالح"),
});

// Types
export type CreateItemImageInput = z.infer<typeof createItemImageSchema>;
export type UpdateItemImageInput = z.infer<typeof updateItemImageSchema>;
export type DeleteItemImageInput = z.infer<typeof deleteItemImageSchema>;
