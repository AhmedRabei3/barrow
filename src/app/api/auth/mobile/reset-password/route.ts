import { NextRequest, NextResponse } from "next/server";

import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import { requestPasswordReset } from "@/lib/authSecurity";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json(
        { error: { code: "INVALID_BODY", message: "email is required" } },
        { status: 400 },
      );
    }

    const isArabic = resolveIsArabicFromRequest(request);
    const result = await requestPasswordReset({
      email,
      isArabic,
      revealDelivery: false,
    });

    return NextResponse.json({
      error: null,
      message: result.message,
      retryAfterSeconds: result.retryAfterSeconds,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Reset password failed",
        },
      },
      { status: 500 },
    );
  }
}
