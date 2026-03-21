import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { success: false, message: "البريد الإلكتروني مطلوب" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // لا تكشف أن البريد غير موجود لأسباب أمنية
    return NextResponse.json({
      success: true,
      message: "إذا كان البريد مسجلاً ستصلك رسالة إعادة تعيين كلمة المرور.",
    });
  }

  // إنشاء رمز إعادة تعيين
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 دقيقة

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      expiresAt: expires,
    },
  });

  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: "إعادة تعيين كلمة المرور",
    html: `<p>انقر على الرابط التالي لإعادة تعيين كلمة المرور:</p><a href="${resetLink}">${resetLink}</a>`,
  });

  return NextResponse.json({
    success: true,
    message: "إذا كان البريد مسجلاً ستصلك رسالة إعادة تعيين كلمة المرور.",
  });
}
