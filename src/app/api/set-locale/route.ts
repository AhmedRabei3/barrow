import { NextRequest, NextResponse } from "next/server";

const LOCALE_COOKIE_KEY = "barrow-locale";
const VALID_LOCALES = ["ar", "en"];

export async function POST(req: NextRequest) {
  try {
    const { locale } = await req.json();
    if (!VALID_LOCALES.includes(locale)) {
      return NextResponse.json(
        { success: false, message: "Invalid locale value" },
        { status: 400 },
      );
    }

    // إعداد الكوكيز لمدة سنة
    const response = NextResponse.json({ success: true });
    response.cookies.set(LOCALE_COOKIE_KEY, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // سنة
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    console.error("Error setting locale:", error);
    return NextResponse.json(
      { success: false, message: "Invalid request body" },
      { status: 400 },
    );
  }
}
