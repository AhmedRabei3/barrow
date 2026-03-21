import { z } from "zod";

export const CreateUserSchema = z.object({
  username: z.string().min(2).max(30),
  email: z.email(),
  password: z.string().min(8).max(50),
});

export const bookingSchema = z.object({
  propertyId: z.string().cuid(),
  startDate: z.string(),
  endDate: z.string(),
});
