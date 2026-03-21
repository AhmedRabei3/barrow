import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

export async function POST(req: Request) {
  const isArabic = resolveIsArabicFromRequest(req);
  try {
    const body = await req.json();
    const rating = await db.review.create({ data: body });
    return NextResponse.json(rating, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? localizeErrorMessage(error.message, isArabic)
            : localizeErrorMessage("Bad request", isArabic),
      },
      { status: 400 },
    );
  }
}
