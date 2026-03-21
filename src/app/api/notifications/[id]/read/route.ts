import { authHelper } from "@/app/api/utils/authHelper";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * @desc راوات تعيين كمقروء
 */

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authHelper();
  const { id } = await params;

  await prisma.notification.updateMany({
    where: {
      id,
      userId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return NextResponse.json({ success: true });
}
