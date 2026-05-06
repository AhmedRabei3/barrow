import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { parseItemSearchQuery } from "@/lib/validators/item-search";
import { searchItems } from "@/server/services/item-search.service";
import { RequestTimeoutError, withTimeout } from "@/app/api/lib/errors/dbGuard";

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const query = parseItemSearchQuery(req.nextUrl.searchParams);

  try {
    const response = await withTimeout(
      searchItems(query),
      12000,
      "Item search timed out",
    );

    return NextResponse.json(response, {
      headers:
        query.userLat === null && query.userLng === null
          ? {
              "Cache-Control":
                "public, s-maxage=300, stale-while-revalidate=600",
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

    if (
      err instanceof RequestTimeoutError &&
      query.userLat !== null &&
      query.userLng !== null
    ) {
      const fallbackResponse = await withTimeout(
        searchItems({
          ...query,
          userLat: null,
          userLng: null,
        }),
        12000,
        "Item search timed out",
      );

      return NextResponse.json(fallbackResponse, {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Search-Fallback": "non-geo",
        },
      });
    }

    if (err instanceof RequestTimeoutError) {
      const reducedLimit = Math.min(
        Math.max(Math.floor(query.limit / 2), 8),
        12,
      );
      const fallbackResponse = await withTimeout(
        searchItems({
          ...query,
          limit: reducedLimit,
        }),
        12000,
        "Item search timed out",
      );

      return NextResponse.json(fallbackResponse, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "X-Search-Fallback": "reduced-limit",
        },
      });
    }

    return handleApiError(err, req);
  }
}
