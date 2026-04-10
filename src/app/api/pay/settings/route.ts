import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

    return NextResponse.json({
      ok: true,
      subscriptionMonthlyPrice: Number(
        settings?.subscriptionMonthlyPrice ?? 30,
      ),
      featuredAdMonthlyPrice: Number(settings?.featuredAdMonthlyPrice ?? 10),
      shamCashQrCodeUrl: settings?.url || "",
      shamCashWalletCode: settings?.ownerProfitWalletCode || "",
      url: settings?.url || "",
    });
  } catch (error) {
    console.error("Failed to load public payment settings:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to load payment settings",
      },
      { status: 500 },
    );
  }
}
