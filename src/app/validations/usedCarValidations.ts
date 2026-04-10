import { z } from "zod";
import { updateLocationSchema } from "./locationValidations";

export const createUsedCarSchema = z
  .object({
    categoryId: z.string().min(1, "Category is required"),
    brand: z.string().min(1, "Brand is required"),
    model: z.string().min(1, "Model is required"),
    year: z
      .number()
      .int("Year must be an integer")
      .min(1900, "Year must be at least 1900")
      .max(new Date().getFullYear() + 1, "Year cannot be in the future"),
    fuelType: z
      .enum(["GASOLINE", "DIESEL", "HYBRID", "ELECTRIC"])
      .catch("GASOLINE"),
    gearType: z.enum(["AUTOMATIC", "MANUAL"]).catch("AUTOMATIC"),
    color: z.string().optional(),
    mileage: z.number().min(0, "Mileage cannot be negative").optional(),
    repainted: z.boolean().default(false),
    reAssembled: z.boolean().default(false),
    price: z.number().positive("Price must be greater than zero"),
    description: z.string().optional(),
    sellOrRent: z.enum(["RENT", "SELL"]).catch("RENT"),
    rentType: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional()
      .nullable(),
    status: z
      .enum([
        "PENDING_REVIEW",
        "AVAILABLE",
        "RESERVED",
        "RENTED",
        "SOLD",
        "MAINTENANCE",
      ])
      .default("AVAILABLE"),
  })
  .refine(
    (data) => {
      if (data.sellOrRent === "RENT" && !data.rentType) {
        return false;
      }
      return true;
    },
    {
      message: "Rental type is required when selecting Rent",
      path: ["rentType"],
    },
  );

export const updateUsedCarSchema = z
  .object({
    brand: z.string().optional(),
    model: z.string().optional(),
    year: z.coerce
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear())
      .optional(),
    color: z.string().optional(),
    mileage: z.coerce.number().nonnegative().optional(),
    price: z.coerce.number().positive().optional(),
    repainted: z.coerce.boolean().optional(),
    reAssembled: z.coerce.boolean().optional(),
    sellOrRent: z.enum(["SELL", "RENT"]).optional(),
    rentType: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional()
      .nullable(),
    status: z
      .enum([
        "PENDING_REVIEW",
        "AVAILABLE",
        "RESERVED",
        "RENTED",
        "SOLD",
        "MAINTENANCE",
      ])
      .optional(),
    description: z.string().max(500).optional(),
    location: updateLocationSchema.optional(),
  })
  .refine((data) => {
    if (!data.sellOrRent) return true;
    if (data.sellOrRent === "RENT") return data.rentType !== null;
    return data.rentType === null;
  });

export const deleteUsedCarSchema = z.object({ id: z.string().min(1) });

// Types
export type CreateUsedCarInput = z.infer<typeof createUsedCarSchema>;
export type UpdateUsedCarInput = z.infer<typeof updateUsedCarSchema>;
export type DeleteUsedCarInput = z.infer<typeof deleteUsedCarSchema>;
