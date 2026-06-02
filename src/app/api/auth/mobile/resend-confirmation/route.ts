import { NextRequest, NextResponse } from "next/server";

import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import {
  createEmailVerification,
  sendEmailVerificationMail,
} from "@/lib/emailVerification";
import { prisma } from "@/lib/prisma";

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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: null });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: null });
    }

    const isArabic = resolveIsArabicFromRequest(request);
    const verification = await createEmailVerification({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    await sendEmailVerificationMail({
      email: user.email,
      name: user.name,
      verificationLink: verification.verificationLink,
      isArabic,
    });

    return NextResponse.json({ error: null });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Resend confirmation failed",
        },
      },
      { status: 500 },
    );
  }
}
