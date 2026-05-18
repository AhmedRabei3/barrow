import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authHelper } from "@/app/api/utils/authHelper";
import { prisma } from "@/lib/prisma";

const isTransientDbError = (error: unknown) =>
  error instanceof Prisma.PrismaClientInitializationError ||
  (error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P1001" || error.code === "P2024"));

export async function GET() {
  try {
    const user = await authHelper();

    const [notificationUnreadCount, chatUnread] = await Promise.all([
      prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      }),
      prisma.chatUnread.aggregate({
        where: { userId: user.id },
        _sum: { count: true },
      }),
    ]);

    const chatUnreadCount = Math.max(0, Number(chatUnread._sum.count ?? 0));

    return NextResponse.json({
      unreadCount: notificationUnreadCount + chatUnreadCount,
      notificationUnreadCount,
      chatUnreadCount,
    });
  } catch (error) {
    if (isTransientDbError(error)) {
      return NextResponse.json({ unreadCount: 0, degraded: true });
    }

    return NextResponse.json({ unreadCount: 0 }, { status: 401 });
  }
}
