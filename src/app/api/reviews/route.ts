import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import { ItemType } from "@prisma/client";
import { z } from "zod";

const createReviewSchema = z.object({
  userId: z.string().min(1),
  listingId: z.string().min(1),
  itemType: z.nativeEnum(ItemType),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: t("غير مصرح", "Unauthorized") },
        { status: 401 },
      );
    }

    const input = createReviewSchema.parse(await req.json());

    const review = await prisma.review.create({
      data: {
        userId: input.userId,
        itemId: input.listingId,
        itemType: input.itemType,
        rate: input.rating,
        comment: input.comment || null,
      } as never,
    });

    return NextResponse.json({
      data: {
        id: review.id,
        rating: review.rate,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}
