import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelper } from "@/app/api/utils/authHelper";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";

/**
 * @description راوت جلب الإشعارات
 * @param req
 * @returns
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authHelper();

    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 20);

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id!,
        isRead: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit + 1, // لجلب عنصر إضافي لمعرفة هل هناك المزيد
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        isRead: true,
        createdAt: true,
      },
    });

    let nextCursor: string | null = null;

    if (notifications.length > limit) {
      const nextItem = notifications.pop();
      nextCursor = nextItem!.id;
    }

    return NextResponse.json({
      data: notifications,
      nextCursor,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}
