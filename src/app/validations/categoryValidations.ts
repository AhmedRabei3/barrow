import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2, "Category name is too short"),
  icon: z.string(),
  type: z.enum(["NEW_CAR", "USED_CAR", "PROPERTY", "OTHER"], {
    message: "Category type is required",
  }),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
});

export const deleteCategorySchema = z.object({
  id: z.string().cuid(),
});

export type CreateCategorySchema = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
