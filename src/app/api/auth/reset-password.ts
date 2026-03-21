import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { registerUserSchema } from "@/app/validations/userValidations";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { success: false, message: "رمز التحقق مفقود" },
      { status: 400 },
    );
  }
  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { success: false, message: "كلمة المرور مطلوبة" },
      { status: 400 },
    );
  }

  // تحقق من قوة كلمة المرور
  const valid = registerUserSchema.shape.password.safeParse(password);
  if (!valid.success) {
    return NextResponse.json(
      {
        success: false,
        message: valid.error.issues[0]?.message || "كلمة المرور غير صالحة",
      },
      { status: 400 },
    );
  }

  // تحقق من الرمز
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });
  if (!resetToken) {
    return NextResponse.json(
      { success: false, message: "رمز إعادة التعيين غير صالح أو منتهي" },
      { status: 400 },
    );
  }

  // تحديث كلمة المرور
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { password: hashed },
  });
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({
    success: true,
    message: "تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.",
  });
}
