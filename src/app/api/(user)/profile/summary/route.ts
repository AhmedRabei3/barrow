import { NextRequest, NextResponse } from "next/server";
import { authHelper } from "@/app/api/utils/authHelper";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";

export async function GET(req: NextRequest) {
  try {
    const session = await authHelper();

    const profile = await prisma.user.findUnique({
      where: { id: session.id },
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
      activeUntil: profile.activeUntil,
      balance: Number(profile.balance ?? 0),
      pendingReferralEarnings: Number(profile.pendingReferralEarnings ?? 0),
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}
