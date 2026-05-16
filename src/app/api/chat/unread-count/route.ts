// src/app/api/chat/unread-count/route.ts
// Returns total unread chat message count for the authenticated user.
// Backed by PostgreSQL (ChatUnread table) — no Firestore.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Prisma } from "@prisma/client";

const isTransientDbError = (error: unknown) =>
  error instanceof Prisma.PrismaClientInitializationError ||
  (error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P1001" || error.code === "P2024"));

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const result = await prisma.chatUnread.aggregate({
      where: { userId },
      _sum: { count: true },
    });

    const unreadCount = Math.max(0, Number(result._sum.count ?? 0));

    return NextResponse.json({ unreadCount });
  } catch (error) {
    if (isTransientDbError(error)) {
      return NextResponse.json({ unreadCount: 0, degraded: true });
    }

    logger.error("Failed to load unread count", error);
    return NextResponse.json(
      { message: "Failed to load unread count" },
      { status: 500 },
    );
  }
}
