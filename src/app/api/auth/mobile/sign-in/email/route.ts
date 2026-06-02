import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { loginUserSchema } from "@/app/validations/userValidations";
import { prisma } from "@/lib/prisma";
import {
  signMobileAccessToken,
  toMobileSessionPayload,
} from "@/lib/mobileAuthBridge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginUserSchema.safeParse(body);

    if (!validation.success) {
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

    const email = validation.data.email.trim().toLowerCase();
    const password = validation.data.password;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user?.password) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials",
          },
        },
        { status: 401 },
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials",
          },
        },
        { status: 401 },
      );
    }

    const accessToken = signMobileAccessToken(user.id);
    const session = toMobileSessionPayload({ user, accessToken });

    return NextResponse.json({ session, error: null });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to sign in",
        },
      },
      { status: 500 },
    );
  }
}
