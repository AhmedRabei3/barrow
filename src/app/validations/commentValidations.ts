import { z } from "zod";

export const createCommentSchema = z.object({
  text: z.string().min(1),
  userId: z.string().cuid(),
  itemId: z.string().cuid(),
  itemType: z.enum(["PROPERTY", "NEW_CAR", "OTHER", "USED_CAR"]),
});

export const updateCommentSchema = z.object({
  text: z.string().min(1).optional(),
});

export const deleteCommentSchema = z.object({
  id: z.string().cuid(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
