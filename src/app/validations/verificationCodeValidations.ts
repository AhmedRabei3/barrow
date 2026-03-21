import { z } from "zod";

export const createVerificationTokenSchema = z.object({
  identifier: z.string().email(),
  token: z.string(),
  expires: z.date(),
});

export const deleteVerificationTokenSchema = z.object({
  identifier: z.string().email(),
  token: z.string(),
});

export type CreateVerificationTokenInput = z.infer<
  typeof createVerificationTokenSchema
>;
export type DeleteVerificationTokenInput = z.infer<
  typeof deleteVerificationTokenSchema
>;
