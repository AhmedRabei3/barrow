"use server";

import {
  registerUserSchema,
  loginUserSchema,
  RegisterUserInput,
  LoginUserInput,
} from "@/app/validations/userValidations";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  createEmailVerification,
  sendEmailVerificationMail,
} from "@/lib/emailVerification";
import { matchPassword } from "./passwordMatcher";

/** login user */
export const loginAction = async (data: LoginUserInput, isArabic: boolean) => {
  const validations = loginUserSchema.safeParse(data);
  if (!validations.success)
    return {
      success: false,
      message: isArabic ? "بيانات اعتماد غير صحيحة" : "Invalid credentials",
    };

  const { email, password } = validations.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password)
    return {
      success: false,
      message: isArabic ? "المستخدم غير موجود" : "User not found",
    };

  // منع تسجيل الدخول إذا لم يتم التحقق من البريد الإلكتروني
  if (!user.emailVerified) {
    return {
      success: false,
      message: isArabic
        ? "يجب تأكيد البريد الإلكتروني أولاً. تحقق من بريدك الإلكتروني لتفعيل الحساب."
        : "You must verify your email first. Check your email to activate your account.",
      requiresEmailVerification: true,
    };
  }

  const passwordMatches = await matchPassword(password, user.password);
  if (!passwordMatches) {
    return {
      success: false,
      message: isArabic ? "كلمة المرور غير صحيحة" : "Incorrect password",
    };
  }

  // منطق الجلسة النشطة يعتمد على JWT فقط
  // يمكن إضافة claim في التوكن لتتبع الجهاز أو sessionId إذا رغبت بذلك
  // هنا نسمح بتسجيل الدخول مباشرة، ويمكن لاحقاً إضافة إشعار أو تحقق إضافي عبر البريد إذا رغبت

  // إذا لم توجد جلسة نشطة، أكمل تسجيل الدخول
  return {
    success: true,
    message: isArabic ? "تم التحقق بنجاح" : "Login successful",
  };
};

//Register a new user
export const registerAction = async (
  data: RegisterUserInput,
  isArabic: boolean,
) => {
  const validations = registerUserSchema.safeParse(data);
  if (!validations.success)
    return {
      success: false,
      message:
        validations.error.issues[0].message ||
        (isArabic ? "بيانات التسجيل غير صحيحة" : "Invalid registration data"),
    };
  const { name, email, password, referredBy } = validations.data;

  const exisstingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (exisstingUser)
    return {
      success: false,
      message: isArabic ? "المستخدم موجود بالفعل" : "User already exists",
    };

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      if (referredBy) {
        const referrer = await tx.user.findUnique({
          where: { id: referredBy },
          select: { id: true, isDeleted: true, isActive: true },
        });

        const existingReferral = await tx.referral.findFirst({
          where: { newUser: newUser.id },
          select: { id: true },
        });

        if (
          referrer &&
          referrer.isActive &&
          !referrer.isDeleted &&
          !existingReferral
        ) {
          await tx.referral.create({
            data: {
              newUser: newUser.id,
              userId: referredBy,
            },
          });
        }
      }

      return { id: newUser.id, name: newUser.name, email: newUser.email };
    });

    if (!result) {
      return {
        success: false,
        message: isArabic ? "فشل إنشاء المستخدم" : "Failed to create user",
      };
    }
    const { verificationLink } = await createEmailVerification({
      userId: result.id,
      email: result.email,
      name: result.name,
    });

    let mailSent = true;
    // ...existing code...
    let mailError: string | undefined = undefined;

    try {
      await sendEmailVerificationMail({
        email: result.email,
        name: result.name,
        verificationLink,
        isArabic,
      });
    } catch (error) {
      mailSent = false;
      mailError =
        error instanceof Error
          ? error.message
          : isArabic
            ? "فشل إرسال البريد"
            : "MAIL_SEND_FAILED";
    }

    return {
      success: true,
      safeUser: result.name,
      message: mailSent
        ? isArabic
          ? "تم التسجيل بنجاح، تحقق من بريدك لتأكيد الحساب"
          : "Registration successful, check your email to verify your account"
        : isArabic
          ? "تم التسجيل لكن تعذر إرسال بريد التحقق، تحقق من إعدادات SMTP"
          : "Registration successful but failed to send verification email, check SMTP settings",
      requiresEmailVerification: true,
      mailSent,
      ...(mailError ? { mailError } : {}),
      ...(process.env.NODE_ENV !== "production" ? { verificationLink } : {}),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : isArabic
          ? "فشل التسجيل"
          : "Registration failed";
    return { success: false, message };
  }
};
