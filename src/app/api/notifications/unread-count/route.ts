import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelper } from "@/app/api/utils/authHelper";

/**
 * @desc راوت جلب عدد إشعارات خاصة بمستخدم معين وغير مقروءة
 * @returns 
 */

export async function GET() {
  const user = await authHelper();

  const unreadCount = await prisma.notification.count({
    where: {
      userId: user.id,
      isRead: false,
    },
  });

  return NextResponse.json({ unreadCount });
}
