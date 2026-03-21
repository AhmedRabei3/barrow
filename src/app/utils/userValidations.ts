import { z } from "zod";

/**
 * ============================
 * User Validation Schemas
 * ============================
 */

// 🔹 إنشاء مستخدم جديد (Register)
export const createUserSchema = z.object({
  email: z.string().email("صيغة البريد الإلكتروني غير صحيحة"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  name: z
    .string()
    .min(2, "الاسم يجب أن يحتوي على حرفين على الأقل")
    .default("Guest"),
  profileImage: z.string().url("رابط الصورة غير صالح").optional(),
});

// النوع (TypeScript type) مشتق تلقائيًا من Zod schema
export type CreateUserInput = z.infer<typeof createUserSchema>;

// 🔹 تسجيل الدخول (Login)
export const loginUserSchema = z.object({
  email: z.string().email("صيغة البريد الإلكتروني غير صحيحة"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;

// 🔹 تحديث / تعديل المستخدم (Update)
// مبدئيًا معظم الحقول اختيارية (لأنك مش لازم تحدث الكل مرة وحدة)
export const updateUserSchema = z.object({
  id: z.string().cuid("المستخدم غير موجود أو محذوف"), // لازم يكون cuid لأنه Prisma هيك مولّد الـ id
  email: z.string().email("صيغة البريد الإلكتروني غير صحيحة").optional(),
  name: z.string().min(2, "الاسم يجب أن يحتوي على حرفين على الأقل").optional(),
  profileImage: z.string().url("رابط الصورة غير صالح").optional(),
  isActive: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  balance: z.number().nonnegative("Balance cannot be negative").optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// 🔹 حذف المستخدم (Delete)
export const deleteUserSchema = z.object({
  id: z.string().cuid("معرّف المستخدم غير صالح"),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;
