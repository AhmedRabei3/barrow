import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { registerUserSchema } from "@/app/validations/userValidations";
import {
  createEmailVerification,
  sendEmailVerificationMail,
} from "@/lib/emailVerification";
import {
  signMobileAccessToken,
  toMobileSessionPayload,
} from "@/lib/mobileAuthBridge";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_BODY",
            message: "email and password are required",
          },
        },
        { status: 400 },
      );
    }

    const passwordValidation =
      registerUserSchema.shape.password.safeParse(password);
    if (!passwordValidation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_PASSWORD",
            message:
              passwordValidation.error.issues[0]?.message ||
              "Password does not meet requirements",
          },
        },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        {
          error: {
            code: "USER_EXISTS",
            message: "User already exists",
          },
        },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const fallbackName = email.split("@")[0] || "user";

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: fallbackName,
      },
    });

    try {
      const verification = await createEmailVerification({
        userId: user.id,
        email: user.email,
        name: user.name,
      });

      await sendEmailVerificationMail({
        email: user.email,
        name: user.name,
        verificationLink: verification.verificationLink,
        isArabic: false,
      });
    } catch {
      // Do not block sign-up when mail provider is unavailable.
    }

    const accessToken = signMobileAccessToken(user.id);
    const session = toMobileSessionPayload({ user, accessToken });

    return NextResponse.json({ session, error: null });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Sign-up failed",
        },
      },
      { status: 500 },
    );
  }
}
