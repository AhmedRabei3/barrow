import { NextRequest, NextResponse } from "next/server";
import { getPublicPaymentSettings } from "@/lib/paymentSettings";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    const settings = await getPublicPaymentSettings();
    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load payment settings";

    return NextResponse.json(
      { message: localizeErrorMessage(message, isArabic) },
      { status: 500 },
    );
  }
}
