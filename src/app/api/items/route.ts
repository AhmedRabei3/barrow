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
import { CACHE_HEADERS } from "@/app/api/lib/cacheHeaders";

function isTimeoutError(err: unknown): boolean {
  if (err instanceof RequestTimeoutError) return true;
  if (err instanceof Error && err.name === "TimeoutError") return true;
  if (
    err instanceof DOMException &&
    (err.code === 23 || err.name === "TimeoutError")
  )
    return true;
  return false;
}

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const query = parseItemSearchQuery(req.nextUrl.searchParams);

  try {
    const response = await withTimeout(
      searchItems(query),
      8000,
      "Item search timed out",
    );

    return NextResponse.json(response, {
      headers:
        query.userLat === null && query.userLng === null
          ? {
              "Cache-Control": CACHE_HEADERS.publicStandard,
            }
          : {
              "Cache-Control": CACHE_HEADERS.privateNoStore,
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
      isTimeoutError(err) &&
      query.userLat !== null &&
      query.userLng !== null
    ) {
      const fallbackResponse = await withTimeout(
        searchItems({
          ...query,
          userLat: null,
          userLng: null,
        }),
        8000,
        "Item search timed out",
      );

      return NextResponse.json(fallbackResponse, {
        headers: {
          "Cache-Control": CACHE_HEADERS.privateNoStore,
          "X-Search-Fallback": "non-geo",
        },
      });
    }

    if (isTimeoutError(err)) {
      const reducedLimit = Math.min(
        Math.max(Math.floor(query.limit / 2), 8),
        12,
      );
      const fallbackResponse = await withTimeout(
        searchItems({
          ...query,
          limit: reducedLimit,
        }),
        8000,
        "Item search timed out",
      );

      return NextResponse.json(fallbackResponse, {
        headers: {
          "Cache-Control": CACHE_HEADERS.publicShort,
          "X-Search-Fallback": "reduced-limit",
        },
      });
    }

    return handleApiError(err, req);
  }
}
