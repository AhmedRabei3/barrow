import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/emailVerification";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  // جلب اللغة من الكوكيز بشكل صحيح
  const langCookie = req.cookies.get("barrow-locale")?.value;
  const isArabic = langCookie === "ar";

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: isArabic ? "رمز التفعيل مفقود" : "Activation token is missing",
      },
      { status: 400 },
    );
  }

  // تحقق من صحة رمز التفعيل
  const verified = await verifyEmailToken(token, isArabic);
  if (
    !verified ||
    typeof verified !== "object" ||
    !("userId" in verified) ||
    !verified.userId
  ) {
    const message =
      typeof verified === "object" && "message" in verified
        ? verified.message
        : isArabic
          ? "رمز التفعيل غير صالح أو منتهي"
          : "Invalid or expired activation token";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }

  // لا يوجد جلسة فعلية في قاعدة البيانات، فقط JWT
  // هنا فقط نعيد رسالة نجاح
  return NextResponse.json({
    success: true,
    message: isArabic
      ? "تم تفعيل الجلسة الجديدة بنجاح."
      : "New session activated successfully.",
  });
}
