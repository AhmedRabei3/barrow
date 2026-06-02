import { NextRequest, NextResponse } from "next/server";

import {
  signMobileAccessToken,
  toMobileSessionPayload,
  verifyMobileAccessToken,
} from "@/lib/mobileAuthBridge";
import { prisma } from "@/lib/prisma";

function resolveBearerToken(request: NextRequest) {
  const header =
    request.headers.get("authorization") ||
    request.headers.get("Authorization");

  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export async function GET(request: NextRequest) {
  try {
    const token = resolveBearerToken(request);
    if (!token) {
      return NextResponse.json({ session: null, error: null });
    }

    const userId = verifyMobileAccessToken(token);
    if (!userId) {
      return NextResponse.json(
        {
          session: null,
          error: {
            code: "INVALID_ACCESS_TOKEN",
            message: "Invalid access token",
          },
        },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        {
          session: null,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 },
      );
    }

    // Re-issue token to keep a single source of truth for mobile session refresh behavior.
    const renewedToken = signMobileAccessToken(user.id);
    const session = toMobileSessionPayload({
      user,
      accessToken: renewedToken,
    });

    return NextResponse.json({ session, error: null });
  } catch {
    return NextResponse.json(
      {
        session: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to resolve session",
        },
      },
      { status: 500 },
    );
  }
}
