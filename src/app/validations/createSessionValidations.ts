import { z } from "zod";

export const createSessionSchema = z.object({
  sessionToken: z.string(),
  expires: z.date(),
});

export const updateSessionSchema = z.object({
  expires: z.date().optional(),
});

export const deleteSessionSchema = z.object({
  sessionToken: z.string(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type DeleteSessionInput = z.infer<typeof deleteSessionSchema>;
