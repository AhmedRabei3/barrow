import { NextRequest, NextResponse } from "next/server";
import { requireAbminUser } from "@/app/api/utils/authHelper";
import {
  getPublicPaymentSettings,
  updatePaymentSettings,
} from "@/lib/paymentSettings";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

const parsePositiveNumber = (value: unknown): number => {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    return 0;
  }

  return Number(asNumber.toFixed(2));
};

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    await requireAbminUser();
    const settings = await getPublicPaymentSettings();

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load payment settings";

    return NextResponse.json(
      { message: localizeErrorMessage(message, isArabic) },
      { status: 401 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    await requireAbminUser();

    const body = (await req.json()) as {
      subscriptionMonthlyPrice?: number;
      featuredAdMonthlyPrice?: number;
      shamCashWalletCode?: string;
      shamCashQrCodeUrl?: string;
    };

    const subscriptionMonthlyPrice = parsePositiveNumber(
      body.subscriptionMonthlyPrice,
    );
    const featuredAdMonthlyPrice = parsePositiveNumber(
      body.featuredAdMonthlyPrice,
    );

    if (!subscriptionMonthlyPrice || !featuredAdMonthlyPrice) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Subscription and featured ad prices must be positive numbers",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    const settings = await updatePaymentSettings({
      subscriptionMonthlyPrice,
      featuredAdMonthlyPrice,
      shamCashWalletCode: body.shamCashWalletCode,
      shamCashQrCodeUrl: body.shamCashQrCodeUrl,
    });

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update payment settings";

    return NextResponse.json(
      { message: localizeErrorMessage(message, isArabic) },
      { status: 500 },
    );
  }
}
