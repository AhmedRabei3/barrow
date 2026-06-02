import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  signMobileAccessToken,
  toMobileSessionPayload,
} from "@/lib/mobileAuthBridge";

type GoogleTokenInfo = {
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
};

async function resolveGoogleProfile(
  idToken: string,
): Promise<GoogleTokenInfo | null> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GoogleTokenInfo;
  if (!payload?.email) {
    return null;
  }

  return payload;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body.token !== "string" || !body.token.trim()) {
      return NextResponse.json(
        { error: { code: "INVALID_BODY", message: "token is required" } },
        { status: 400 },
      );
    }

    const profile = await resolveGoogleProfile(body.token.trim());
    if (!profile?.email) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_GOOGLE_TOKEN",
            message: "Google sign-in failed",
          },
        },
        { status: 401 },
      );
    }

    const normalizedEmail = profile.email.trim().toLowerCase();
    const verifiedAt =
      profile.email_verified === true || profile.email_verified === "true"
        ? new Date()
        : null;

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        name: profile.name || undefined,
        profileImage: profile.picture || undefined,
        image: profile.picture || undefined,
        ...(verifiedAt ? { emailVerified: verifiedAt } : {}),
      },
      create: {
        email: normalizedEmail,
        name: profile.name || normalizedEmail.split("@")[0],
        profileImage: profile.picture || null,
        image: profile.picture || null,
        emailVerified: verifiedAt,
        isActive: true,
      },
    });

    const accessToken = signMobileAccessToken(user.id);
    const session = toMobileSessionPayload({ user, accessToken });

    return NextResponse.json({ session, error: null });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Google sign-in failed",
        },
      },
      { status: 500 },
    );
  }
}
