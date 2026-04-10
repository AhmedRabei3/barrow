import { Directions } from "@prisma/client";
import { z } from "zod";
import { updateLocationSchema } from "./locationValidations";
const DIRECTIONS = Object.values(Directions) as [Directions, ...Directions[]];

export const createPropertySchema = z
  .object({
    title: z.string().trim().min(2, "Title too short"),

    description: z
      .string()
      .trim()
      .max(1000)
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),

    price: z.coerce.number().positive("السعر يجب أن يكون أكبر من صفر"),

    guests: z.coerce.number().int().nonnegative().default(1),

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

    livingrooms: z.coerce.number().int().nonnegative(),
    bathrooms: z.coerce.number().int().nonnegative(),
    bedrooms: z.coerce.number().int().nonnegative(),
    kitchens: z.coerce.number().int().nonnegative(),
    area: z.coerce.number().nonnegative(),

    direction: z.array(z.enum(DIRECTIONS)).nonempty(),

    categoryId: z.string().cuid(),

    petAllowed: z.boolean().default(false),
    elvator: z.boolean().default(false),
    furnished: z.boolean().default(false),

    floor: z.coerce.number().int(),

    sellOrRent: z.enum(["SELL", "RENT"]).default("RENT"),

    rentType: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .nullable()
      .optional(),
  })
  .refine((data) => data.sellOrRent !== "RENT" || data.rentType !== null, {
    message: "يرجى تحديد نوع الإيجار",
    path: ["rentType"],
  });

/*---------------------Update realestate route-------------------- */
export const updatePropertySchema = z
  .object({
    id: z.string().cuid(),

    title: z.string().optional(),

    description: z
      .string()
      .trim()
      .max(1000)
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),

    price: z.coerce.number().positive().optional(),

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

    guests: z.coerce.number().int().nonnegative().optional(),

    direction: z.array(z.enum(DIRECTIONS)).optional(),

    livingrooms: z.coerce.number().int().nonnegative().optional(),
    bathrooms: z.coerce.number().int().nonnegative().optional(),
    bedrooms: z.coerce.number().int().nonnegative().optional(),
    kitchens: z.coerce.number().int().nonnegative().optional(),
    area: z.coerce.number().nonnegative().optional(),

    petAllowed: z.boolean().optional(),
    elvator: z.boolean().optional(),
    furnished: z.boolean().optional(),

    floor: z.coerce.number().int().optional(),

    sellOrRent: z.enum(["SELL", "RENT"]).optional(),

    rentType: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .nullable()
      .optional(),

    categoryId: z.string().cuid().optional(),
    location: updateLocationSchema,
  })
  .refine((data) => data.sellOrRent !== "RENT" || data.rentType !== null, {
    message: "يرجى تحديد نوع الإيجار",
    path: ["rentType"],
  });
export const deletePropertySchema = z.object({
  id: z.string().cuid(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type DeletePropertyInput = z.infer<typeof deletePropertySchema>;
