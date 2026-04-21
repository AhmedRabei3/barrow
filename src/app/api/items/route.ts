import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { parseItemSearchQuery } from "@/lib/validators/item-search";
import { searchItems } from "@/server/services/item-search.service";
import { withTimeout } from "@/app/api/lib/errors/dbGuard";

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  try {
    const query = parseItemSearchQuery(req.nextUrl.searchParams);
    const response = await withTimeout(
      searchItems(query),
      7000,
      "Item search timed out",
    );

    return NextResponse.json(response, {
      headers:
        query.userLat === null && query.userLng === null
          ? {
              "Cache-Control":
                "public, s-maxage=60, stale-while-revalidate=300",
            }
          : {
              "Cache-Control": "private, no-store",
            },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: localizeErrorMessage(
            err.issues[0]?.message ?? "Invalid request",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    return handleApiError(err, req);
  }
}
