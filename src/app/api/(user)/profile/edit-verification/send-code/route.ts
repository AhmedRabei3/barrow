import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelper } from "@/app/api/utils/authHelper";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { generateVerificationCode } from "@/lib/profileEditVerification";
import bcrypt from "bcryptjs";
import { sendMail } from "@/lib/mailer";

const CODE_EXPIRES_MINUTES = 10;
const SEND_COOLDOWN_SECONDS = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await authHelper();
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    const latestCode = await prisma.profileEditVerificationCode.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (latestCode) {
      const elapsed = Date.now() - new Date(latestCode.createdAt).getTime();
      if (elapsed < SEND_COOLDOWN_SECONDS * 1000) {
        return NextResponse.json(
          {
            success: false,
            message: "يرجى الانتظار دقيقة قبل طلب رمز جديد",
          },
          { status: 429 },
        );
      }
    }

    const code = generateVerificationCode(6);
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000);

    await prisma.profileEditVerificationCode.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const createdCode = await prisma.profileEditVerificationCode.create({
      data: {
        userId: user.id,
        email: user.email,
        codeHash,
        expiresAt,
      },
      select: { id: true },
    });

    try {
      await sendMail({
        to: user.email,
        subject: "رمز التحقق لتعديل الحساب",
        text: `رمز التحقق الخاص بك هو ${code}. الرمز صالح لمدة ${CODE_EXPIRES_MINUTES} دقائق.`,
        html: `
          <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
            <h2>رمز التحقق لتعديل الحساب</h2>
            <p>مرحبًا ${user.name || ""}</p>
            <p>رمز التحقق الخاص بك هو:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
            <p>صلاحية الرمز: ${CODE_EXPIRES_MINUTES} دقائق.</p>
          </div>
        `,
      });
    } catch (mailError) {
      await prisma.profileEditVerificationCode.delete({
        where: { id: createdCode.id },
      });
      throw mailError;
    }

    return NextResponse.json({
      success: true,
      message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}
