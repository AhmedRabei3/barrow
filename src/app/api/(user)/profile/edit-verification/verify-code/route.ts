import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authHelper } from "@/app/api/utils/authHelper";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { createProfileEditTicket } from "@/lib/profileEditVerification";

const MAX_ATTEMPTS = 5;
const TICKET_EXPIRES_SECONDS = 600;

export async function POST(req: NextRequest) {
  try {
    const session = await authHelper();
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    const body = (await req.json()) as { code?: string };
    const code = body?.code?.trim();

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, message: "الرجاء إدخال رمز مكون من 6 أرقام" },
        { status: 400 },
      );
    }

    const pendingCode = await prisma.profileEditVerificationCode.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!pendingCode) {
      return NextResponse.json(
        { success: false, message: "لا يوجد رمز تحقق صالح، أعد طلب رمز جديد" },
        { status: 400 },
      );
    }

    if (pendingCode.expiresAt.getTime() < Date.now()) {
      await prisma.profileEditVerificationCode.update({
        where: { id: pendingCode.id },
        data: { usedAt: new Date() },
      });

      return NextResponse.json(
        { success: false, message: "انتهت صلاحية رمز التحقق" },
        { status: 400 },
      );
    }

    if (pendingCode.attempts >= MAX_ATTEMPTS) {
      await prisma.profileEditVerificationCode.update({
        where: { id: pendingCode.id },
        data: { usedAt: new Date() },
      });

      return NextResponse.json(
        {
          success: false,
          message: "تم تجاوز عدد المحاولات المسموح، اطلب رمزًا جديدًا",
        },
        { status: 429 },
      );
    }

    const isMatch = await bcrypt.compare(code, pendingCode.codeHash);
    if (!isMatch) {
      const nextAttempts = pendingCode.attempts + 1;
      await prisma.profileEditVerificationCode.update({
        where: { id: pendingCode.id },
        data: {
          attempts: nextAttempts,
          ...(nextAttempts >= MAX_ATTEMPTS ? { usedAt: new Date() } : {}),
        },
      });

      return NextResponse.json(
        { success: false, message: "رمز التحقق غير صحيح" },
        { status: 400 },
      );
    }

    await prisma.profileEditVerificationCode.update({
      where: { id: pendingCode.id },
      data: { usedAt: new Date(), attempts: pendingCode.attempts + 1 },
    });

    const ticket = createProfileEditTicket({
      userId: user.id,
      email: user.email,
      expiresInSeconds: TICKET_EXPIRES_SECONDS,
    });

    return NextResponse.json({
      success: true,
      message: "تم التحقق بنجاح",
      ticket,
      expiresInSeconds: TICKET_EXPIRES_SECONDS,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}
