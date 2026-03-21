import { z } from "zod";
import { updateLocationSchema } from "./locationValidations";

// 🔹 helper: يحول "" إلى undefined
export const emptyToUndefined = z
  .string()
  .transform((val) => (val === "" ? undefined : val));

export const createNewCarSchema = z
  .object({
    brand: z.string().min(2),
    model: z.string().min(1),

    year: z.coerce.number().int().gte(1900).lte(new Date().getFullYear()),

    color: z.string(),
    price: z.coerce.number().positive(),

    description: emptyToUndefined.optional(),

    categoryId: z.cuid(),

    sellOrRent: z.enum(["SELL", "RENT"]),

    rentType: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional()
      .nullable(),

    fuelType: z
      .enum(["GASOLINE", "DIESEL", "ELECTRIC", "HYBRID"])
      .default("GASOLINE"),

    gearType: z.enum(["AUTOMATIC", "MANUAL"]),

    status: z
      .enum(["AVAILABLE", "RESERVED", "RENTED", "SOLD", "MAINTENANCE"])
      .default("AVAILABLE"),
  })
  .refine(
    (data) =>
      data.sellOrRent === "RENT"
        ? data.rentType !== null
        : data.rentType === null,
    {
      message: "rentType مطلوب فقط عند الإيجار",
      path: ["rentType"],
    },
  );

// update new car validations
export const updateNewCarSchema = z
  .object({
    brand: z.string().min(2).optional(),
    model: z.string().min(1).optional(),

    year: z.coerce
      .number()
      .int()
      .gte(1900)
      .lte(new Date().getFullYear())
      .optional(),

    color: z.string().min(2).optional(),
    price: z.coerce.number().positive().optional(),

    description: emptyToUndefined.optional(),

    categoryId: z.cuid().optional(),

    sellOrRent: z.enum(["SELL", "RENT"]).optional(),

    rentType: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]) // allow explicit null to clear when switching to SELL
      .optional()
      .nullable(),

    fuelType: z.enum(["GASOLINE", "DIESEL", "ELECTRIC", "HYBRID"]).optional(),
    gearType: z.enum(["AUTOMATIC", "MANUAL"]).optional(),

    status: z
      .enum(["AVAILABLE", "RESERVED", "RENTED", "SOLD", "MAINTENANCE"])
      .default("AVAILABLE")
      .optional(),
    location: updateLocationSchema,
  })
  .refine((data) => {
    if (!data.sellOrRent) return true;
    if (data.sellOrRent === "RENT") return !!data.rentType;
    return !data.rentType;
  });

export type CreateNewCarInput = z.infer<typeof createNewCarSchema>;
