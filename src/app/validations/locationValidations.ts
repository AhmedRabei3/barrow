import { z } from "zod";

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(3),
  city: z.string().min(2),
  state: z.string().optional(),
  country: z.string().min(2),
});

export const updateLocationSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export const deleteLocationSchema = z.object({
  id: z.string().cuid(),
});

export type CreateLocationInputType = z.infer<typeof locationSchema>;
export type UpdateLocationSchema = z.infer<typeof updateLocationSchema>;