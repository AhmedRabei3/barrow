import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";

const EMAIL_VERIFY_EXPIRES_HOURS = 24;

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

export async function createEmailVerification(params: {
  userId: string;
  email: string;
  name: string;
}) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFY_EXPIRES_HOURS * 60 * 60 * 1000,
  );

  await prisma.emailVerificationToken.updateMany({
    where: { userId: params.userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.emailVerificationToken.create({
    data: {
      userId: params.userId,
      email: params.email,
      tokenHash,
      expiresAt,
    },
  });

  const verificationLink = `${getAppBaseUrl()}/verify-email?token=${token}`;

  return {
    verificationLink,
    expiresAt,
  };
}

export async function sendEmailVerificationMail(params: {
  email: string;
  name: string;
  verificationLink: string;
  isArabic: boolean;
}) {
  await sendMail({
    to: params.email,
    subject: params.isArabic ? "تأكيد البريد الإلكتروني" : "Email Verification",
    text: params.isArabic
      ? `مرحباً ${params.name}، لتأكيد بريدك الإلكتروني اضغط الرابط: ${params.verificationLink}`
      : `Hello ${params.name}, please verify your email by clicking the link: ${params.verificationLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; direction: ${params.isArabic ? "rtl" : "ltr"}; text-align: ${params.isArabic ? "right" : "left"};">
        <h2>${params.isArabic ? "تأكيد البريد الإلكتروني" : "Email Verification"}</h2>
        <p>${params.isArabic ? `مرحبًا ${params.name}` : `Hello ${params.name}`}</p>
        <p>${params.isArabic ? "اضغط الرابط التالي لتأكيد ملكية بريدك الإلكتروني:" : "Please click the link below to verify your email:"}</p>
        <p>
          <a href="${params.verificationLink}" style="display:inline-block;padding:10px 14px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;">
            ${params.isArabic ? "تأكيد البريد الإلكتروني" : "Verify Email"}
          </a>
        </p>
        <p>${params.isArabic ? "أو انسخ الرابط:" : "Or copy the link:"}</p>
        <p style="word-break:break-all;">${params.verificationLink}</p>
        <p>${params.isArabic ? "صلاحية الرابط: 24 ساعة." : "Link validity: 24 hours."}</p>
        <p>${params.isArabic ? "إذا لم تكن أنت من طلب هذا البريد الإلكتروني، تجاهله." : "If you did not request this email, please ignore it."}</p>
      </div>
    `,
  });
}

export async function verifyEmailToken(token: string, isArabic: boolean) {
  const tokenHash = sha256(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
  if (!record) {
    return {
      success: false,
      message: isArabic ? "رابط التحقق غير صالح" : "Invalid verification link",
    } as const;
  }

  if (record.usedAt) {
    return {
      success: false,
      message: isArabic
        ? "تم استخدام رابط التحقق مسبقًا"
        : "Verification link has already been used",
    } as const;
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return {
      success: false,
      message: isArabic
        ? "انتهت صلاحية رابط التحقق"
        : "Verification link has expired",
    } as const;
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: {
        emailVerified: new Date(),
      },
    }),
  ]);

  return {
    success: true,
    message: isArabic
      ? "تم تأكيد البريد الإلكتروني بنجاح"
      : "Email verified successfully",
  } as const;
}
