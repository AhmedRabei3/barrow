import { NextResponse } from "next/server";
import { ApiError } from "./ApiError";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

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
