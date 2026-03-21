import { z } from "zod";

// 🔹 helper: يحول "" إلى undefined
const emptyToUndefined = z
  .string()
  .transform((val) => (val === "" ? undefined : val));

export const createOtherItemSchema = z
  .object({
    name: z.string().min(1, "اسم العنصر مطلوب"),
    brand: z.string().min(2, "العلامة التجارية مطلوبة"),

    description: emptyToUndefined.optional(),

    price: z.coerce.number().positive("السعر يجب أن يكون أكبر من صفر"),

    categoryId: z.string().cuid("معرف الفئة غير صالح"),

    sellOrRent: z.enum(["SELL", "RENT"]).default("SELL"),

    rentType: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional()
      .nullable(),

    status: z
      .enum(["AVAILABLE", "RESERVED", "RENTED", "SOLD", "MAINTENANCE"])
      .default("AVAILABLE"),
  })
  .refine(
    (data) => {
      if (data.sellOrRent === "RENT") return !!data.rentType;
      return !data.rentType;
    },
    {
      message: "rentType مطلوب فقط عند الإيجار",
      path: ["rentType"],
    }
  );

export const updateOtherItemSchema = z
  .object({
    name: z.string().optional(),
    brand: z.string().min(2).optional(),
    description: emptyToUndefined.optional(),
    price: z.coerce.number().positive().optional(),

    sellOrRent: z.enum(["SELL", "RENT"]).optional(),

    rentType: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional()
      .nullable(),

    status: z
      .enum(["AVAILABLE", "RESERVED", "RENTED", "SOLD", "MAINTENANCE"])
      .optional(),

    // 📍 تحديث الموقع (اختياري)
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    city: z.string().min(2).optional(),
    address: z.string().min(5).optional(),
    state: emptyToUndefined.optional(),
    country: z.string().min(2).optional(),
  })
  .refine(
    (data) => {
      if (data.sellOrRent === "RENT") return !!data.rentType;
      if (data.sellOrRent === "SELL") return !data.rentType;
      return true;
    },
    {
      message: "rentType غير متوافق مع نوع العملية",
      path: ["rentType"],
    }
  );

export const deleteOtherItemSchema = z.object({
  id: z.string().cuid(),
});

// Types
export type CreateOtherItemInput = z.infer<typeof createOtherItemSchema>;
export type UpdateOtherItemInput = z.infer<typeof updateOtherItemSchema>;
export type DeleteOtherItemInput = z.infer<typeof deleteOtherItemSchema>;
