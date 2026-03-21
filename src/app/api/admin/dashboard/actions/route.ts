import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { requireAbminUser } from "../../../utils/authHelper";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";

type AdminAction = "BLOCK" | "NOTIFY" | "REWARD" | "RANDOM_LOW_REWARD";

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    await requireAbminUser();

    const body = (await req.json()) as {
      action?: AdminAction;
      userId?: string;
      message?: string;
      amount?: number;
      candidateCount?: number;
      maxBalance?: number;
      minReward?: number;
      maxReward?: number;
    };

    if (!body.action || (body.action !== "RANDOM_LOW_REWARD" && !body.userId)) {
      return NextResponse.json(
        {
          message: t(
            "الحقل action مطلوب، وuserId مطلوب للإجراءات المباشرة",
            "action is required, and userId is required for direct actions",
          ),
        },
        { status: 400 },
      );
    }

    if (body.action === "RANDOM_LOW_REWARD") {
      const candidateCount = Math.max(1, Number(body.candidateCount ?? 10));
      const maxBalance = Number(body.maxBalance ?? 20);
      const minReward = Number(body.minReward ?? 2);
      const maxReward = Number(body.maxReward ?? 8);

      if (!Number.isFinite(maxBalance) || maxBalance < 0) {
        return NextResponse.json(
          {
            message: t(
              "يجب أن تكون قيمة maxBalance رقمًا غير سالب",
              "maxBalance must be a non-negative number",
            ),
          },
          { status: 400 },
        );
      }

      if (
        !Number.isFinite(minReward) ||
        !Number.isFinite(maxReward) ||
        minReward <= 0 ||
        maxReward < minReward
      ) {
        return NextResponse.json(
          { message: t("نطاق المكافأة غير صالح", "Invalid reward range") },
          { status: 400 },
        );
      }

      const candidates = await prisma.user.findMany({
        where: {
          isDeleted: false,
          balance: { lte: maxBalance },
        },
        select: {
          id: true,
          name: true,
          balance: true,
        },
        orderBy: { balance: "asc" },
        take: candidateCount,
      });

      if (candidates.length === 0) {
        return NextResponse.json(
          {
            message: t(
              "لم يتم العثور على مرشحين منخفضي الربح",
              "No low-earning candidates found",
            ),
          },
          { status: 404 },
        );
      }

      const randomIndex = Math.floor(Math.random() * candidates.length);
      const winner = candidates[randomIndex];
      const randomReward = Number(
        (Math.random() * (maxReward - minReward) + minReward).toFixed(2),
      );

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: winner.id },
          data: {
            balance: { increment: randomReward },
          },
        });

        await tx.chargingLog.create({
          data: {
            userId: winner.id,
            type: "RANDOM_LOW_REWARD",
            amount: randomReward,
          },
        });

        await tx.notification.create({
          data: {
            userId: winner.id,
            title: "🎁 مكافأة عشوائية للأقل ربحًا",
            message: `مبروك! حصلت على مكافأة قدرها ${randomReward}$ ضمن برنامج دعم المشتركين الأقل ربحًا.`,
            type: NotificationType.INFO,
          },
        });
      });

      return NextResponse.json(
        {
          success: true,
          rewardedUserId: winner.id,
          rewardedUserName: winner.name,
          amount: randomReward,
        },
        { status: 200 },
      );
    }

    const targetUserId = body.userId;

    if (!targetUserId) {
      return NextResponse.json(
        {
          message: t(
            "الحقل userId مطلوب لهذا الإجراء",
            "userId is required for this action",
          ),
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isDeleted: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: t("المستخدم غير موجود", "User not found") },
        { status: 404 },
      );
    }

    if (body.action === "BLOCK") {
      await prisma.user.update({
        where: { id: targetUserId },
        data: { isDeleted: true, isActive: false },
      });

      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: "⚠️ تم تقييد الحساب",
          message:
            body.message ||
            "تم تقييد حسابك من قبل الإدارة. يرجى التواصل مع الدعم للمراجعة.",
          type: NotificationType.WARNING,
        },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (body.action === "NOTIFY") {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: "🔔 إشعار من الإدارة",
          message: body.message || "لديك تحديث مهم من فريق الإدارة.",
          type: NotificationType.INFO,
        },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (body.action === "REWARD") {
      const amount = Number(body.amount ?? 0);

      if (amount <= 0) {
        return NextResponse.json(
          {
            message: t(
              "يجب أن تكون قيمة amount أكبر من 0",
              "amount must be greater than 0",
            ),
          },
          { status: 400 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: targetUserId },
          data: {
            balance: { increment: amount },
          },
        });

        await tx.chargingLog.create({
          data: {
            userId: targetUserId,
            type: "REWARD",
            amount,
          },
        });

        await tx.notification.create({
          data: {
            userId: targetUserId,
            title: "🎉 مكافأة مميزة",
            message:
              body.message ||
              `تمت إضافة مكافأة بقيمة ${amount}$ إلى رصيدك تقديراً لنشاطك.`,
            type: NotificationType.INFO,
          },
        });
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json(
      { message: t("الإجراء غير صالح", "Invalid action") },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { message: t("غير مصرح", "Unauthorized") },
      { status: 401 },
    );
  }
}
