import { z } from "zod";

const optionalComment = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const createPropertyRatingSchema = z.object({
  propertyId: z.string().cuid(),

  userId: z.string().cuid(),

  rating: z.number().int().min(1).max(5),

  comment: optionalComment,
});

export const createUserRatingSchema = z.object({
  ratedUserId: z.string().cuid(),

  raterId: z.string().cuid(),

  rating: z.number().int().min(1).max(5),

  comment: optionalComment,
});
export type CreatePropertyRatingInput = z.infer<
  typeof createPropertyRatingSchema
>;
export type CreateUserRatingInput = z.infer<typeof createUserRatingSchema>;
