import { z } from "zod";

const emptyToUndefined = z
  .string()
  .transform((val) => (val === "" ? undefined : val));

const emptyValueToUndefined = (value: unknown) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return value;
};

const optionalNumber = z.preprocess(
  emptyValueToUndefined,
  z.coerce.number().int().nonnegative().optional(),
);

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

export const createMedicalDeviceSchema = z
  .object({
    name: z.string().min(1, "اسم الجهاز مطلوب"),
    manufacturer: emptyToUndefined.optional(),
    model: emptyToUndefined.optional(),
    description: emptyToUndefined.optional(),
    price: z.coerce.number().positive("السعر يجب أن يكون أكبر من صفر"),
    categoryId: z.string().cuid("معرف الفئة غير صالح"),
    deviceClass: emptyToUndefined.optional(),
    condition: emptyToUndefined.optional(),
    manufacturerCountry: emptyToUndefined.optional(),
    isUsed: optionalBoolean,
    warrantyMonths: optionalNumber,
    usageHours: optionalNumber,
    requiresPrescription: optionalBoolean,
    maintenanceRecordAvailable: optionalBoolean,
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

export const updateMedicalDeviceSchema = z
  .object({
    name: z.string().min(1).optional(),
    manufacturer: emptyToUndefined.optional(),
    model: emptyToUndefined.optional(),
    description: emptyToUndefined.optional(),
    price: z.coerce.number().positive().optional(),
    deviceClass: emptyToUndefined.optional(),
    condition: emptyToUndefined.optional(),
    manufacturerCountry: emptyToUndefined.optional(),
    isUsed: optionalBoolean,
    warrantyMonths: optionalNumber,
    usageHours: optionalNumber,
    requiresPrescription: optionalBoolean,
    maintenanceRecordAvailable: optionalBoolean,
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
