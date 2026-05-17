import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CACHE_HEADERS } from "@/app/api/lib/cacheHeaders";

export async function GET() {
  const fallback = {
    ok: true,
    subscriptionMonthlyPrice: 30,
    featuredAdMonthlyPrice: 10,
    shamCashQrCodeUrl: "",
    shamCashWalletCode: "",
    syriatelCashQrCodeUrl: "",
    syriatelCashWalletCode: "",
    url: "",
  };

  try {
    const settings = await prisma.appPaymentSettings.findUnique({
      where: { id: 1 },
      select: {
        subscriptionMonthlyPrice: true,
        featuredAdMonthlyPrice: true,
        url: true,
        ownerProfitWalletCode: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        subscriptionMonthlyPrice: Number(
          settings?.subscriptionMonthlyPrice ?? 30,
        ),
        featuredAdMonthlyPrice: Number(settings?.featuredAdMonthlyPrice ?? 10),
        shamCashQrCodeUrl: settings?.url || "",
        shamCashWalletCode: settings?.ownerProfitWalletCode || "",
        syriatelCashQrCodeUrl: process.env.SYRIATEL_CASH_QR_CODE_URL || "",
        syriatelCashWalletCode: process.env.SYRIATEL_CASH_WALLET_CODE || "",
        url: settings?.url || "",
      },
      {
        headers: {
          "Cache-Control": CACHE_HEADERS.publicStandard,
        },
      },
    );
  } catch (error) {
    console.error("Failed to load public payment settings:", error);

    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": CACHE_HEADERS.publicShort,
      },
    });
  }
}
