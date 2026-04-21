import { NextResponse } from "next/server";
import { ApiError } from "./ApiError";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { isDatabaseUnavailableError, RequestTimeoutError } from "./dbGuard";

export function handleApiError(
  error: unknown,
  request?: { headers: { get: (key: string) => string | null } },
) {
  const isArabic = request ? resolveIsArabicFromRequest(request) : false;

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        message: localizeErrorMessage(error.message, isArabic),
        code: error.code,
        field: error.field ?? null,
      },
      { status: error.statusCode },
    );
  }

  if (isDatabaseUnavailableError(error)) {
    return NextResponse.json(
      {
        success: false,
        message: localizeErrorMessage(
          "Database temporarily unavailable",
          isArabic,
        ),
      },
      { status: 503 },
    );
  }

  if (error instanceof RequestTimeoutError) {
    return NextResponse.json(
      {
        success: false,
        message: localizeErrorMessage(error.message, isArabic),
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      success: false,
      message: localizeErrorMessage(
        "Request failed with status code 500",
        isArabic,
      ),
    },
    { status: 500 },
  );
}
