import { z } from "zod";

export const createCategorySchema = z.object({
  nameAr: z.string().trim().min(2, "Arabic category name is too short"),
  nameEn: z.string().trim().min(2, "English category name is too short"),
  icon: z.string(),
  type: z.enum(["NEW_CAR", "USED_CAR", "PROPERTY", "OTHER"], {
    message: "Category type is required",
  }),
});

export const updateCategorySchema = z.object({
  id: z.string().cuid(),
  nameAr: z.string().trim().min(2).optional(),
  nameEn: z.string().trim().min(2).optional(),
  icon: z.string().trim().optional(),
  type: z.enum(["NEW_CAR", "USED_CAR", "PROPERTY", "OTHER"]).optional(),
});

export const deleteCategorySchema = z.object({
  id: z.string().cuid(),
});

export type CreateCategorySchema = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
