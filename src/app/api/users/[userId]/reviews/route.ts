import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await context.params;

    const reviews = await prisma.review.findMany({
      where: {
        userId,
      } as never,
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        rate: true,
        comment: true,
        createdAt: true,
        user: true,
      },
    });

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((total, review) => total + review.rate, 0) /
          reviews.length
        : 0;

    return NextResponse.json({
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rate,
        comment: review.comment,
        createdAt: review.createdAt,
        reviewer: {
          id: review.user.id,
          name: review.user.name,
          avatar: null,
        },
      })),
      averageRating,
      totalReviews: reviews.length,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}
