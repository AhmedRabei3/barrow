// src/app/api/chat/register-fcm-token/route.ts
// Stores an FCM device token for the authenticated user in PostgreSQL.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = (await req.json()) as { token?: unknown };

    if (typeof body.token !== "string" || body.token.trim().length === 0) {
      return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    }

    const token = body.token.trim();

    // Upsert: if this token already exists under another user, re-assign it.
    await prisma.userFcmToken.upsert({
      where: { token },
      create: { userId, token },
      update: { userId, updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Failed to register FCM token", error);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = (await req.json()) as { token?: unknown };

    if (typeof body.token !== "string" || body.token.trim().length === 0) {
      return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    }

    const token = body.token.trim();

    await prisma.userFcmToken.deleteMany({
      where: { userId, token },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Failed to delete FCM token", error);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
