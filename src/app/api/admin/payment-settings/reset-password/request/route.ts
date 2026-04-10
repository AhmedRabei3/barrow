import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import { requireOwnerUser } from "@/app/api/utils/authHelper";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const owner = await requireOwnerUser();
    const [settings, ownerUser] = await Promise.all([
      prisma.appPaymentSettings.findUnique({ where: { id: 1 } }),
      prisma.user.findUnique({
        where: { id: owner.id },
        select: { email: true, name: true },
      }),
    ]);

    const targetEmail =
      settings?.paymentResetEmail?.trim() || ownerUser?.email?.trim() || "";

    if (!targetEmail) {
      return NextResponse.json(
        {
          ok: false,
          message: t(
            "لا يوجد بريد صالح لإرسال رابط إعادة التعيين.",
            "No valid email is configured for sending the reset link.",
          ),
        },
        { status: 400 },
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin || "";
    const resetLink = `${origin}/admin?page=payment-settings&paymentResetToken=${token}`;

    await prisma.appPaymentSettings.upsert({
      where: { id: 1 },
      update: {
        paymentResetTokenHash: tokenHash,
        paymentResetTokenExpires: expiresAt,
      },
      create: {
        id: 1,
        paymentResetTokenHash: tokenHash,
        paymentResetTokenExpires: expiresAt,
        paymentResetEmail: settings?.paymentResetEmail || null,
      },
    });

    await sendMail({
      to: targetEmail,
      subject: t(
        "رابط إعادة تعيين كلمة مرور إعدادات الدفع",
        "Payment settings password reset link",
      ),
      text: t(
        `مرحباً ${ownerUser?.name || ""}\n\nاستخدم الرابط التالي لإعادة تعيين كلمة مرور إعدادات الدفع خلال 30 دقيقة:\n${resetLink}`,
        `Hello ${ownerUser?.name || ""}\n\nUse the following link to reset the payment settings password within 30 minutes:\n${resetLink}`,
      ),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7">
          <h2>${t(
            "إعادة تعيين كلمة مرور إعدادات الدفع",
            "Reset payment settings password",
          )}</h2>
          <p>${t(
            "تم طلب إعادة تعيين كلمة مرور إعدادات الدفع. الرابط التالي صالح لمدة 30 دقيقة:",
            "A request was made to reset the payment settings password. The following link is valid for 30 minutes:",
          )}</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
        </div>
      `,
    });

    return NextResponse.json({
      ok: true,
      message: t(
        "تم إرسال رابط إعادة التعيين إلى البريد المحدد.",
        "The reset link was sent to the configured email.",
      ),
    });
  } catch (error) {
    console.error("Failed to send payment settings reset link:", error);
    return NextResponse.json(
      {
        ok: false,
        message: t(
          "تعذر إرسال رابط إعادة التعيين حالياً.",
          "Unable to send the reset link right now.",
        ),
      },
      { status: 500 },
    );
  }
}
