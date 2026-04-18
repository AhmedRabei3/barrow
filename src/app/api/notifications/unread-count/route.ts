import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelper } from "@/app/api/utils/authHelper";
import { Prisma } from "@prisma/client";

/**
 * @desc راوت جلب عدد إشعارات خاصة بمستخدم معين وغير مقروءة
 * @returns
 */

export async function GET() {
  try {
    const user = await authHelper();

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    const isDbUnavailable =
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P1001");

    if (isDbUnavailable) {
      return NextResponse.json({ unreadCount: 0, degraded: true });
    }

    return NextResponse.json({ unreadCount: 0 }, { status: 401 });
  }
}
