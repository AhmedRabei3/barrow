import crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import { requireOwnerUser } from "@/app/api/utils/authHelper";
import { prisma } from "@/lib/prisma";

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    await requireOwnerUser();
    const parsed = resetSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: t(
            "بيانات إعادة التعيين غير صالحة.",
            "Invalid reset request data.",
          ),
        },
        { status: 400 },
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(parsed.data.token)
      .digest("hex");
    const settings = await prisma.appPaymentSettings.findUnique({
      where: { id: 1 },
      select: {
        paymentResetTokenHash: true,
        paymentResetTokenExpires: true,
      },
    });

    const isValid =
      settings?.paymentResetTokenHash === tokenHash &&
      Boolean(
        settings.paymentResetTokenExpires &&
        settings.paymentResetTokenExpires > new Date(),
      );

    if (!isValid) {
      return NextResponse.json(
        {
          ok: false,
          message: t(
            "رابط إعادة التعيين غير صالح أو منتهي.",
            "The reset link is invalid or expired.",
          ),
        },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.appPaymentSettings.upsert({
      where: { id: 1 },
      update: {
        adminSettingsPassword: passwordHash,
        paymentResetTokenHash: null,
        paymentResetTokenExpires: null,
      },
      create: {
        id: 1,
        adminSettingsPassword: passwordHash,
      },
    });

    return NextResponse.json({
      ok: true,
      message: t(
        "تم تعيين كلمة مرور جديدة بنجاح.",
        "A new password has been set successfully.",
      ),
    });
  } catch (error) {
    console.error("Failed to confirm payment settings password reset:", error);
    return NextResponse.json(
      {
        ok: false,
        message: t(
          "تعذر إتمام إعادة التعيين حالياً.",
          "Unable to complete the reset right now.",
        ),
      },
      { status: 500 },
    );
  }
}
