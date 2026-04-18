import crypto from "crypto";

import { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const FAILED_LOGIN_ALERT_THRESHOLD = 5;

const getAppUrl = () => {
  const rawUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000";

  return rawUrl.replace(/\/$/, "");
};

const buildPasswordResetMessage = (params: {
  isArabic: boolean;
  revealDelivery: boolean;
  email: string;
}) => {
  if (!params.revealDelivery) {
    return params.isArabic
      ? "إذا كان البريد مسجلاً ستصلك رسالة إعادة تعيين كلمة المرور."
      : "If that email is registered, you will receive a password reset message.";
  }

  return params.isArabic
    ? `تم إرسال رسالة إعادة تعيين كلمة المرور إلى ${params.email}.`
    : `A password reset email has been sent to ${params.email}.`;
};

export async function createPasswordResetRecord(params: {
  userId: string;
  email: string;
  name: string;
}) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.updateMany({
    where: {
      userId: params.userId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: params.userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    resetLink: `${getAppUrl()}/reset-password?token=${token}`,
    expiresAt,
  };
}

export async function sendPasswordResetMail(params: {
  email: string;
  name: string;
  resetLink: string;
  isArabic: boolean;
}) {
  const subject = params.isArabic
    ? "إعادة تعيين كلمة المرور"
    : "Reset your password";

  const html = params.isArabic
    ? `
      <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
        <p>مرحباً ${params.name || ""}</p>
        <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
        <p>اضغط على الرابط التالي لمتابعة إعادة التعيين:</p>
        <p><a href="${params.resetLink}">${params.resetLink}</a></p>
        <p>سينتهي هذا الرابط خلال 30 دقيقة.</p>
        <p>إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
        <p>Hello ${params.name || ""},</p>
        <p>We received a request to reset your account password.</p>
        <p>Use the link below to continue:</p>
        <p><a href="${params.resetLink}">${params.resetLink}</a></p>
        <p>This link expires in 30 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `;

  const text = params.isArabic
    ? `تلقينا طلباً لإعادة تعيين كلمة المرور. استخدم الرابط التالي خلال 30 دقيقة: ${params.resetLink}`
    : `We received a password reset request. Use this link within 30 minutes: ${params.resetLink}`;

  await sendMail({
    to: params.email,
    subject,
    html,
    text,
  });
}

export async function requestPasswordReset(params: {
  email: string;
  isArabic: boolean;
  revealDelivery?: boolean;
}) {
  const normalizedEmail = params.email.trim().toLowerCase();
  const revealDelivery = Boolean(params.revealDelivery);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    return {
      success: true,
      userExists: false,
      message: buildPasswordResetMessage({
        isArabic: params.isArabic,
        revealDelivery: false,
        email: normalizedEmail,
      }),
    };
  }

  const { resetLink } = await createPasswordResetRecord({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  await sendPasswordResetMail({
    email: user.email,
    name: user.name,
    resetLink,
    isArabic: params.isArabic,
  });

  return {
    success: true,
    userExists: true,
    message: buildPasswordResetMessage({
      isArabic: params.isArabic,
      revealDelivery,
      email: user.email,
    }),
    ...(process.env.NODE_ENV !== "production" ? { resetLink } : {}),
  };
}

export async function sendFailedLoginAlert(params: {
  email: string;
  name: string;
  failedAttempts: number;
  isArabic: boolean;
}) {
  const subject = params.isArabic
    ? "تنبيه أمني: محاولات تسجيل دخول متكررة"
    : "Security alert: repeated sign-in attempts";

  const html = params.isArabic
    ? `
      <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
        <p>مرحباً ${params.name || ""}</p>
        <p>رصدنا أكثر من خمس محاولات غير ناجحة لتسجيل الدخول إلى حسابك.</p>
        <p>عدد المحاولات الأخيرة: ${params.failedAttempts}</p>
        <p>إذا كنت أنت من يحاول الدخول، ننصحك باستخدام خيار "نسيت كلمة المرور" لإعادة تعيينها.</p>
        <p>إذا لم تكن هذه المحاولات منك، يرجى إعادة تعيين كلمة المرور فوراً.</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
        <p>Hello ${params.name || ""},</p>
        <p>We detected more than five unsuccessful attempts to sign in to your account.</p>
        <p>Recent failed attempts: ${params.failedAttempts}</p>
        <p>If this was you, use the forgot password flow to reset your password.</p>
        <p>If this was not you, please reset your password immediately.</p>
      </div>
    `;

  const text = params.isArabic
    ? `رصدنا أكثر من خمس محاولات غير ناجحة لتسجيل الدخول إلى حسابك. عدد المحاولات الأخيرة: ${params.failedAttempts}`
    : `We detected more than five unsuccessful sign-in attempts to your account. Recent failed attempts: ${params.failedAttempts}`;

  await sendMail({
    to: params.email,
    subject,
    html,
    text,
  });
}

export async function notifyFailedLoginThreshold(params: {
  userId: string;
  email: string;
  name: string;
  failedAttempts: number;
  isArabic: boolean;
}) {
  if (params.failedAttempts <= FAILED_LOGIN_ALERT_THRESHOLD) {
    return false;
  }

  await Promise.allSettled([
    sendFailedLoginAlert({
      email: params.email,
      name: params.name,
      failedAttempts: params.failedAttempts,
      isArabic: params.isArabic,
    }),
    prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.isArabic
          ? "تنبيه أمني على الحساب"
          : "Account security alert",
        message: params.isArabic
          ? `تم رصد ${params.failedAttempts} محاولات فاشلة لتسجيل الدخول إلى حسابك. إذا لم تكن منك، أعد تعيين كلمة المرور فوراً.`
          : `${params.failedAttempts} failed sign-in attempts were detected on your account. If this was not you, reset your password immediately.`,
        type: NotificationType.WARNING,
      },
    }),
  ]);

  return true;
}
