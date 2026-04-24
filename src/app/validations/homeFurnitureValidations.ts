import { z } from "zod";

const emptyToUndefined = z
  .string()
  .transform((val) => (val === "" ? undefined : val));

const optionalBoolean = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return value;
}, z.boolean().optional());

const baseRentFields = {
  sellOrRent: z.enum(["SELL", "RENT"]).default("SELL"),
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
};

export const createHomeFurnitureSchema = z
  .object({
    name: z.string().min(1, "اسم قطعة الأثاث مطلوب"),
    brand: emptyToUndefined.optional(),
    description: emptyToUndefined.optional(),
    price: z.coerce.number().positive("السعر يجب أن يكون أكبر من صفر"),
    categoryId: z.string().cuid("معرف الفئة غير صالح"),
    furnitureType: emptyToUndefined.optional(),
    condition: emptyToUndefined.optional(),
    material: emptyToUndefined.optional(),
    roomType: emptyToUndefined.optional(),
    dimensions: emptyToUndefined.optional(),
    color: emptyToUndefined.optional(),
    assemblyIncluded: optionalBoolean,
    isUsed: optionalBoolean,
    ...baseRentFields,
  })
  .refine(
    (data) => {
      if (data.sellOrRent === "RENT") return !!data.rentType;
      return !data.rentType;
    },
    {
      message: "rentType مطلوب فقط عند الإيجار",
      path: ["rentType"],
    },
  );

export const updateHomeFurnitureSchema = z
  .object({
    name: z.string().min(1).optional(),
    brand: emptyToUndefined.optional(),
    description: emptyToUndefined.optional(),
    price: z.coerce.number().positive().optional(),
    furnitureType: emptyToUndefined.optional(),
    condition: emptyToUndefined.optional(),
    material: emptyToUndefined.optional(),
    roomType: emptyToUndefined.optional(),
    dimensions: emptyToUndefined.optional(),
    color: emptyToUndefined.optional(),
    assemblyIncluded: optionalBoolean,
    isUsed: optionalBoolean,
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
    },
  );
