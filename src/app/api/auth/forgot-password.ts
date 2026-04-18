import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/authSecurity";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const isArabic = resolveIsArabicFromRequest(req);

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      {
        success: false,
        message: isArabic ? "البريد الإلكتروني مطلوب" : "Email is required",
      },
      { status: 400 },
    );
  }

  const result = await requestPasswordReset({
    email,
    isArabic,
    revealDelivery: false,
  });

  return NextResponse.json(result);
}
