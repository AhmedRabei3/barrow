import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerUser } from "@/app/api/utils/authHelper";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import { calculatePlatformProfitSummary } from "@/lib/platformProfitSummary";

const OWNER_WITHDRAWAL_TYPE = "OWNER_PROFIT_WITHDRAWAL";

const buildOwnerProfitSummary = async () => {
  const [
    settings,
    revenueAgg,
    balancesAgg,
    pendingAgg,
    previousWithdrawalsAgg,
    history,
  ] = await Promise.all([
    prisma.appPaymentSettings.findUnique({
      where: { id: 1 },
      select: { ownerProfitWalletCode: true },
    }),
    prisma.chargingLog.aggregate({
      where: { type: "SUBSCRIPTION_REVENUE" },
      _sum: { amount: true },
    }),
    prisma.user.aggregate({
      where: { isDeleted: false },
      _sum: { balance: true },
    }),
    prisma.user.aggregate({
      where: { isDeleted: false },
      _sum: { pendingReferralEarnings: true },
    }),
    prisma.ownerProfitWithdrawal.aggregate({
      _sum: { amount: true },
    }),
    prisma.ownerProfitWithdrawal.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const subscriptionRevenueTotal = Number(revenueAgg._sum.amount ?? 0);
  const readyUserProfitsTotal = Number(balancesAgg._sum.balance ?? 0);
  const pendingUserProfitsTotal = Number(
    pendingAgg._sum.pendingReferralEarnings ?? 0,
  );
  const previousOwnerWithdrawalsTotal = Number(
    previousWithdrawalsAgg._sum.amount ?? 0,
  );
  const summary = calculatePlatformProfitSummary({
    subscriptionRevenueTotal,
    readyUserProfitsTotal,
    pendingUserProfitsTotal,
    previousOwnerWithdrawalsTotal,
  });

  return {
    walletCode: settings?.ownerProfitWalletCode || "",
    summary: {
      subscriptionRevenueTotal: summary.subscriptionRevenueTotal,
      previousOwnerWithdrawalsTotal: summary.previousOwnerWithdrawalsTotal,
      readyUserProfitsTotal: summary.readyUserProfitsTotal,
      pendingUserProfitsTotal: summary.pendingUserProfitsTotal,
      operatingReserve: summary.operatingReserve,
      totalLiveUserLiabilities: summary.totalLiveUserLiabilities,
      netProfit: summary.netProfit,
      availableToWithdraw: summary.availableToWithdraw,
    },
    history: history.map((entry) => ({
      id: entry.id,
      amount: Number(entry.amount ?? 0),
      walletCode: entry.walletCode,
      note: entry.note,
      status: entry.status,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
};

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    await requireOwnerUser();
    return NextResponse.json({
      ok: true,
      ...(await buildOwnerProfitSummary()),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: t(
          "تعذر تحميل بيانات سحب أرباح المالك",
          "Failed to load owner profit withdrawal data",
        ),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const owner = await requireOwnerUser();
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const body = (await req.json()) as {
      amount?: number;
      note?: string;
      walletCode?: string;
    };

    const amount = Number(body.amount ?? 0);
    const note = String(body.note || "").trim() || null;
    const walletCode = String(body.walletCode || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: t("قيمة السحب غير صالحة", "Invalid withdrawal amount"),
        },
        { status: 400 },
      );
    }

    if (!walletCode) {
      return NextResponse.json(
        {
          ok: false,
          message: t(
            "يرجى إدخال محفظة المالك",
            "Owner wallet code is required",
          ),
        },
        { status: 400 },
      );
    }

    const current = await buildOwnerProfitSummary();
    if (amount > current.summary.availableToWithdraw) {
      return NextResponse.json(
        {
          ok: false,
          message: t(
            "المبلغ يتجاوز الرصيد الآمن القابل للسحب",
            "Amount exceeds the safely withdrawable balance",
          ),
        },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.ownerProfitWithdrawal.create({
        data: {
          amount,
          walletCode,
          note,
          adminId: owner.id,
        },
      });

      await tx.chargingLog.create({
        data: {
          userId: owner.id,
          type: OWNER_WITHDRAWAL_TYPE,
          amount: -Math.abs(amount),
        },
      });
    });

    return NextResponse.json({
      ok: true,
      message: t(
        "تم تسجيل سحب أرباح المالك",
        "Owner profit withdrawal recorded",
      ),
      ...(await buildOwnerProfitSummary()),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: t(
          "تعذر تسجيل سحب أرباح المالك",
          "Failed to record owner profit withdrawal",
        ),
      },
      { status: 500 },
    );
  }
}
