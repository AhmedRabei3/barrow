import { z } from "zod";
import { phoneSchema } from "./purchaseValidations";
import {
  DEFAULT_USER_INTEREST_ORDER,
  normalizeUserInterestOrder,
  USER_INTEREST_KEYS,
} from "@/lib/primaryCategories";

// اسم افتراضي guest + رقم عشوائي
const generateGuestName = () =>
  `guest${Math.floor(1000 + Math.random() * 9000)}`;

const commonPasswords = [
  "12345678",
  "password",
  "qwerty",
  "123456789",
  "11111111",
  "1234567890",
  "1234567",
  "123123",
  "abc123",
  "password1",
  "2468101214",
  "12341234",
  "1q2w3e4r",
  "100200300",
  "123qweasd",
];

export const registerUserSchema = z.object({
  name: z.string().min(3).default(generateGuestName),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .refine((val) => /[A-Z]/.test(val), {
      message: "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل",
    })
    .refine((val) => /[a-z]/.test(val), {
      message: "يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل",
    })
    .refine((val) => /[0-9]/.test(val), {
      message: "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل",
    })
    .refine((val) => /[^A-Za-z0-9]/.test(val), {
      message: "يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل",
    })
    .refine((val) => !commonPasswords.includes(val), {
      message: "كلمة المرور شائعة جداً وغير آمنة",
    }),
  profileImage: z.string().url().optional(),
  referredBy: z.string().cuid().optional(),
  interestOrder: z
    .array(z.enum(USER_INTEREST_KEYS))
    .default(DEFAULT_USER_INTEREST_ORDER)
    .refine(
      (value) => new Set(value).size === USER_INTEREST_KEYS.length,
      "رتّب جميع الاهتمامات مرة واحدة بدون تكرار",
    )
    .transform((value) => normalizeUserInterestOrder(value)),
  acceptPrivacyPolicy: z.boolean().refine((value) => value === true, {
    message: "يجب الموافقة على شروط التسجيل وسياسة الخصوصية لإكمال التسجيل",
  }),
});

// تسجيل دخول
export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// تحديث المستخدم
export const updateUserSchema = z.object({
  name: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  phone: phoneSchema.optional(),
  profileImage: z.string().url().optional(),
});

// Admin only
export const adminUpdateUserSchema = z.object({
  isActive: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  balance: z.number().nonnegative().optional(),
});

// حذف مستخدم
export const deleteUserSchema = z.object({
  id: z.string().cuid(),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;
