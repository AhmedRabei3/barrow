import { NextResponse } from "next/server";
import {
  type AuthedRequest,
  withMobileOrWebAuth,
} from "@/app/middlewares/auth.middleware";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { prisma } from "@/lib/prisma";

export const GET = withMobileOrWebAuth(async (req: AuthedRequest) => {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        isActive: true,
        activeUntil: true,
        balance: true,
        pendingReferralEarnings: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: profile.id,
      isActive: profile.isActive,
      activeUntil: profile.activeUntil?.toISOString() ?? null,
      balance: Number(profile.balance ?? 0),
      pendingReferralEarnings: Number(profile.pendingReferralEarnings ?? 0),
    });
  } catch (error) {
    return handleApiError(error, req);
  }
});
