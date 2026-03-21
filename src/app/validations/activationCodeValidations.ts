import { z } from "zod";

export const deleteActivationCodeSchema = z.object({
  id: z.string().cuid(),
});

// ...existing code...
export type DeleteActivationCodeInput = z.infer<
  typeof deleteActivationCodeSchema
>;
