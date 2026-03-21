import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/emailVerification";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";

  // جلب اللغة من الكوكيز
  const langCookie = req.cookies.get("barrow-locale")?.value;
  const isArabic = langCookie === "ar";

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: isArabic
          ? "رمز التحقق مفقود"
          : "Verification token is missing",
      },
      { status: 400 },
    );
  }

  const result = await verifyEmailToken(token, isArabic);

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}
