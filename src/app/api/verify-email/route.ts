import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/emailVerification";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token is required." },
        { status: 400 },
      );
    }
    // اللغة الافتراضية: العربية
    const result = await verifyEmailToken(token, true);
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 },
      );
    }
  } catch (e) {
    console.error("Error verifying email token:", e);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 },
    );
  }
}
