import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ItemType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "يجب تسجيل الدخول أولاً" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as {
      itemId?: string;
      itemType?: ItemType;
      rate?: number;
      comment?: string;
    };

    const itemId = body?.itemId;
    const itemType = body?.itemType;
    const rate = Number(body?.rate ?? 0);
    const comment = body?.comment?.trim() || undefined;

    if (!itemId || !itemType || !Object.values(ItemType).includes(itemType)) {
      return NextResponse.json(
        { success: false, message: "بيانات العنصر غير صالحة" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(rate) || rate < 1 || rate > 5) {
      return NextResponse.json(
        { success: false, message: "التقييم يجب أن يكون من 1 إلى 5" },
        { status: 400 },
      );
    }

    const existing = await prisma.review.findFirst({
      where: {
        userId: session.user.id,
        itemId,
        itemType,
      },
      select: { id: true },
    });

    const review = existing
      ? await prisma.review.update({
          where: { id: existing.id },
          data: { rate, comment },
        })
      : await prisma.review.create({
          data: {
            userId: session.user.id,
            itemId,
            itemType,
            rate,
            comment,
          },
        });

    return NextResponse.json({ success: true, review }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "حدث خطأ أثناء حفظ التقييم",
      },
      { status: 500 },
    );
  }
}
