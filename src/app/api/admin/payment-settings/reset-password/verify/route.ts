import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import { requireOwnerUser } from "@/app/api/utils/authHelper";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    await requireOwnerUser();

    const token = String(req.nextUrl.searchParams.get("token") || "").trim();
    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          message: t("رمز إعادة التعيين مفقود.", "Reset token is missing."),
        },
        { status: 400 },
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
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

    return NextResponse.json(
      {
        ok: isValid,
        message: isValid
          ? t("الرابط صالح.", "The reset link is valid.")
          : t(
              "الرابط منتهي أو غير صالح.",
              "The reset link is invalid or expired.",
            ),
      },
      { status: isValid ? 200 : 400 },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: t("غير مصرح.", "Unauthorized."),
      },
      { status: 401 },
    );
  }
}
