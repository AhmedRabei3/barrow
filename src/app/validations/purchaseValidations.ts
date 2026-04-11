import { z } from "zod";
import { ItemType } from "@prisma/client";

export const adminClaimPurchaseRequestSchema = z.object({
  requestId: z.string().cuid("معرف الطلب غير صالح"),
});

export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+?[1-9]\d{7,14}$/,
    "رقم الهاتف غير صالح، استخدم صيغة دولية مثل +49123456789",
  );

export const createPurchaseRequestSchema = z.object({
  itemId: z.string().cuid("معرف العنصر غير صالح"),

  itemType: z.nativeEnum(ItemType),

  fullName: z
    .string()
    .trim()
    .min(2, "الاسم قصير جدًا")
    .max(120, "الاسم طويل جدًا"),

  requestKind: z.enum(["BUY", "RENT"]).default("BUY"),

  phoneNumber: phoneSchema,
  note: z
    .string()
    .min(5, "الملاحظة قصيرة جدًا")
    .max(500, "الملاحظة طويلة جدًا")
    .optional(),
});

export const adminDecisionSchema = z.object({
  requestId: z.string().cuid(),

  decision: z.enum(["APPROVE", "REJECT"]),

  adminNote: z.string().min(5, "الملاحظة مطلوبة عند الرفض").max(500).optional(),
});

export const adminDecisionSchemaWithLogic = adminDecisionSchema.superRefine(
  (data, ctx) => {
    if (data.decision === "REJECT" && !data.adminNote) {
      ctx.addIssue({
        path: ["adminNote"],
        message: "سبب الرفض مطلوب",
        code: z.ZodIssueCode.custom,
      });
    }
  },
);

export const adminGetRequestSchema = z.object({
  requestId: z.string().cuid(),
});

export const ownerDecisionSchema = z
  .object({
    requestId: z.string().cuid(),
    decision: z.enum(["ACCEPT", "DECLINE"]),
    ownerPhoneNumber: phoneSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === "ACCEPT" && !data.ownerPhoneNumber) {
      ctx.addIssue({
        path: ["phoneNumber"],
        message: "يرجى إدخال رقم الهاتف ليتم التواصل معك",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export const convertToTransactionSchema = z.object({
  requestId: z.string().cuid(),

  finalPrice: z.number().positive("السعر النهائي غير صالح"),

  platformFeePercent: z.number().min(0).max(100).optional(),
});
