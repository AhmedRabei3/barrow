"use server";

import {
  registerUserSchema,
  loginUserSchema,
  RegisterUserInput,
  LoginUserInput,
} from "@/app/validations/userValidations";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  createEmailVerification,
  sendEmailVerificationMail,
} from "@/lib/emailVerification";
import { matchPassword } from "./passwordMatcher";
import {
  notifyFailedLoginThreshold,
  requestPasswordReset,
} from "@/lib/authSecurity";
import {
  normalizeUserInterestOrder,
  USER_INTEREST_KEYS,
} from "@/lib/primaryCategories";

/** login user */
export const loginAction = async (data: LoginUserInput, isArabic: boolean) => {
  const validations = loginUserSchema.safeParse(data);
  if (!validations.success)
    return {
      success: false,
      message: isArabic ? "بيانات اعتماد غير صحيحة" : "Invalid credentials",
    };

  const { password } = validations.data;
  const email = validations.data.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      emailVerified: true,
      failedLoginAttempts: true,
      failedLoginAlertSentAt: true,
    },
  });
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
    const nextFailedLoginAttempts = user.failedLoginAttempts + 1;
    const shouldNotify =
      nextFailedLoginAttempts > 5 && !user.failedLoginAlertSentAt;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: { increment: 1 },
        lastFailedLoginAt: new Date(),
        ...(shouldNotify ? { failedLoginAlertSentAt: new Date() } : {}),
      },
    });

    if (shouldNotify) {
      await notifyFailedLoginThreshold({
        userId: user.id,
        email: user.email,
        name: user.name,
        failedAttempts: nextFailedLoginAttempts,
        isArabic,
      });
    }

    return {
      success: false,
      message: shouldNotify
        ? isArabic
          ? "كلمة المرور غير صحيحة. أرسلنا لك تنبيهاً أمنياً بسبب تكرار المحاولات الفاشلة."
          : "Incorrect password. We sent you a security alert because of repeated failed attempts."
        : isArabic
          ? "كلمة المرور غير صحيحة"
          : "Incorrect password",
    };
  }

  if (user.failedLoginAttempts > 0 || user.failedLoginAlertSentAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        failedLoginAlertSentAt: null,
      },
    });
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
  const { name, password, referredBy, interestOrder } = validations.data;
  const email = validations.data.email.trim().toLowerCase();

  const exisstingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
    },
  });

  if (exisstingUser && !exisstingUser.emailVerified)
    return {
      success: false,
      message: isArabic
        ? "هذا الحساب مسجل بالفعل لكنه غير مؤكد. تحقق من رسالة البريد الإلكتروني أو أعد إرسال رسالة جديدة."
        : "This account already exists but is not verified yet. Check your email or resend a new verification message.",
      reason: "USER_UNVERIFIED" as const,
      email,
    };

  if (exisstingUser)
    return {
      success: false,
      message: isArabic ? "المستخدم موجود بالفعل" : "User already exists",
      reason: "USER_EXISTS" as const,
      email,
    };

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          preferredInterestOrder: interestOrder,
        },
      });

      await tx.notification.create({
        data: {
          userId: newUser.id,
          title: isArabic
            ? "🎉 مرحبًا بك في Mashhoor"
            : "🎉 Welcome to Mashhoor",
          message: isArabic
            ? "تم إنشاء حسابك بنجاح. فعّل بريدك الإلكتروني أولاً، ثم فعّل اشتراكك للاستفادة من النشر والدعوات والأرباح."
            : "Your account was created successfully. Verify your email first, then activate your subscription to unlock publishing, referrals, and earnings.",
          type: NotificationType.INFO,
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

export const requestExistingUserPasswordResetAction = async (
  email: string,
  isArabic: boolean,
) => {
  const validation = loginUserSchema.shape.email.safeParse(email);

  if (!validation.success) {
    return {
      success: false,
      message: isArabic
        ? "صيغة البريد الإلكتروني غير صحيحة"
        : "Invalid email format",
    };
  }

  try {
    return await requestPasswordReset({
      email: validation.data,
      isArabic,
      revealDelivery: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر إرسال رسالة إعادة التعيين"
            : "Failed to send reset email",
    };
  }
};

export const resendVerificationEmailAction = async (
  email: string,
  isArabic: boolean,
) => {
  const validation = loginUserSchema.shape.email.safeParse(email);

  if (!validation.success) {
    return {
      success: false,
      message: isArabic
        ? "صيغة البريد الإلكتروني غير صحيحة"
        : "Invalid email format",
    };
  }

  const normalizedEmail = validation.data.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
    },
  });

  if (!user) {
    return {
      success: false,
      message: isArabic ? "المستخدم غير موجود" : "User not found",
    };
  }

  if (user.emailVerified) {
    return {
      success: false,
      message: isArabic
        ? "هذا الحساب مؤكد بالفعل. يمكنك تسجيل الدخول مباشرة."
        : "This account is already verified. You can sign in directly.",
    };
  }

  try {
    const { verificationLink } = await createEmailVerification({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    await sendEmailVerificationMail({
      email: user.email,
      name: user.name,
      verificationLink,
      isArabic,
    });

    return {
      success: true,
      message: isArabic
        ? `تم إرسال رسالة تأكيد جديدة إلى ${user.email}.`
        : `A new verification email has been sent to ${user.email}.`,
      ...(process.env.NODE_ENV !== "production" ? { verificationLink } : {}),
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر إعادة إرسال رسالة التأكيد"
            : "Failed to resend verification email",
    };
  }
};

export const updatePreferredInterestOrderAction = async (
  interestOrder: string[],
  isArabic: boolean,
) => {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: isArabic ? "يجب تسجيل الدخول أولاً" : "You must sign in first",
    };
  }

  const validation = z
    .array(z.enum(USER_INTEREST_KEYS))
    .safeParse(interestOrder);

  if (!validation.success) {
    return {
      success: false,
      message: isArabic
        ? "ترتيب الاهتمامات غير صالح"
        : "Invalid interest order",
    };
  }

  const preferredInterestOrder = normalizeUserInterestOrder(validation.data);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { preferredInterestOrder },
  });

  return {
    success: true,
    preferredInterestOrder,
  };
};
