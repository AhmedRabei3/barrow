import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "../../../utils/authHelper";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import { recordPlatformProfitLedgerEntries } from "@/lib/platformProfitLedger";

type AdminAction =
  | "BLOCK"
  | "UNBLOCK"
  | "MAKE_ADMIN"
  | "REMOVE_ADMIN"
  | "NOTIFY"
  | "REWARD"
  | "RANDOM_LOW_REWARD";

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const actingAdmin = await requireAdminUser();

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

      const winner = candidates[Math.floor(Math.random() * candidates.length)];
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

        await recordPlatformProfitLedgerEntries(tx, [
          {
            type: "RANDOM_LOW_REWARD_LIABILITY",
            amount: -randomReward,
            userId: winner.id,
            referenceId: winner.id,
            note: "Random low-earning reward increased ready user liability",
          },
        ]);

        await tx.notification.create({
          data: {
            userId: winner.id,
            title: "🎁 مكافأة عشوائية للأقل ربحًا",
            message: `مبروك! حصلت على مكافأة قدرها ${randomReward}$ وتمت إضافتها إلى رصيدك الجاهز للسحب ضمن برنامج دعم المشتركين الأقل ربحًا.`,
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

    const targetUserId = String(body.userId || "").trim();
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
      select: {
        id: true,
        isAdmin: true,
        isOwner: true,
        isDeleted: true,
        deletedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: t("المستخدم غير موجود", "User not found") },
        { status: 404 },
      );
    }

    if (body.action === "MAKE_ADMIN" || body.action === "REMOVE_ADMIN") {
      if (!actingAdmin.isOwner) {
        return NextResponse.json(
          {
            message: t(
              "فقط مالك التطبيق يستطيع تعيين المشرفين",
              "Only the app owner can manage admin assignments",
            ),
          },
          { status: 403 },
        );
      }

      if (user.isOwner) {
        return NextResponse.json(
          {
            message: t(
              "لا يمكن تعديل صلاحيات مالك التطبيق من هنا",
              "The application owner role cannot be changed from here",
            ),
          },
          { status: 400 },
        );
      }

      const nextIsAdmin = body.action === "MAKE_ADMIN";

      await prisma.user.update({
        where: { id: targetUserId },
        data: { isAdmin: nextIsAdmin },
      });

      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: nextIsAdmin
            ? t("✅ تمت ترقيتك إلى مشرف", "✅ You were promoted to admin")
            : t("ℹ️ تم سحب صلاحية الإشراف", "ℹ️ Admin access was revoked"),
          message: nextIsAdmin
            ? t(
                "أصبحت تملك صلاحية دخول لوحة الإدارة وإدارة أجزاء المنصة المسموح بها.",
                "You can now access the admin dashboard and manage the allowed platform sections.",
              )
            : t(
                "لم يعد حسابك يملك صلاحية دخول لوحة الإدارة.",
                "Your account no longer has access to the admin dashboard.",
              ),
          type: NotificationType.INFO,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: nextIsAdmin
            ? t("تم تعيين المستخدم كمشرف", "User promoted to admin")
            : t("تم إلغاء صفة المشرف", "Admin role revoked"),
        },
        { status: 200 },
      );
    }

    if (
      user.isOwner &&
      (body.action === "BLOCK" || body.action === "UNBLOCK")
    ) {
      return NextResponse.json(
        {
          message: t(
            "لا يمكن حظر مالك التطبيق",
            "The application owner cannot be blocked",
          ),
        },
        { status: 400 },
      );
    }

    if (body.action === "BLOCK") {
      const blockResult = await prisma.$transaction(async (tx) => {
        const deletedAt = new Date();

        const [
          updatedUser,
          properties,
          newCars,
          oldCars,
          otherItems,
          notification,
        ] = await Promise.all([
          tx.user.update({
            where: { id: targetUserId },
            data: {
              isDeleted: true,
              isActive: false,
              deletedAt,
              activeUntil: null,
            },
            select: { id: true },
          }),
          tx.property.updateMany({
            where: { ownerId: targetUserId, isDeleted: false },
            data: { isDeleted: true, deletedAt },
          }),
          tx.newCar.updateMany({
            where: { ownerId: targetUserId, isDeleted: false },
            data: { isDeleted: true, deletedAt },
          }),
          tx.oldCar.updateMany({
            where: { ownerId: targetUserId, isDeleted: false },
            data: { isDeleted: true, deletedAt },
          }),
          tx.otherItem.updateMany({
            where: { ownerId: targetUserId, isDeleted: false },
            data: { isDeleted: true, deletedAt },
          }),
          tx.notification.create({
            data: {
              userId: targetUserId,
              title: "⚠️ تم تقييد الحساب",
              message:
                body.message ||
                "تم تقييد حسابك من قبل الإدارة، وتم إخفاء عناصر حسابك من المنصة. يرجى التواصل مع الدعم للمراجعة.",
              type: NotificationType.WARNING,
            },
            select: { id: true },
          }),
        ]);

        return {
          userId: updatedUser.id,
          hiddenListings:
            properties.count + newCars.count + oldCars.count + otherItems.count,
          notificationId: notification.id,
        };
      });

      return NextResponse.json(
        {
          success: true,
          ...blockResult,
          message: t(
            `تم حظر المستخدم وإخفاء ${blockResult.hiddenListings} من عناصره.`,
            `User blocked and ${blockResult.hiddenListings} listings were hidden.`,
          ),
        },
        { status: 200 },
      );
    }

    if (body.action === "UNBLOCK") {
      const matchingDeletedAt = user.deletedAt ?? null;

      const unblockResult = await prisma.$transaction(async (tx) => {
        const [
          updatedUser,
          properties,
          newCars,
          oldCars,
          otherItems,
          notification,
        ] = await Promise.all([
          tx.user.update({
            where: { id: targetUserId },
            data: {
              isDeleted: false,
              deletedAt: null,
              isActive: false,
            },
            select: { id: true },
          }),
          tx.property.updateMany({
            where: {
              ownerId: targetUserId,
              isDeleted: true,
              ...(matchingDeletedAt ? { deletedAt: matchingDeletedAt } : {}),
            },
            data: { isDeleted: false, deletedAt: null },
          }),
          tx.newCar.updateMany({
            where: {
              ownerId: targetUserId,
              isDeleted: true,
              ...(matchingDeletedAt ? { deletedAt: matchingDeletedAt } : {}),
            },
            data: { isDeleted: false, deletedAt: null },
          }),
          tx.oldCar.updateMany({
            where: {
              ownerId: targetUserId,
              isDeleted: true,
              ...(matchingDeletedAt ? { deletedAt: matchingDeletedAt } : {}),
            },
            data: { isDeleted: false, deletedAt: null },
          }),
          tx.otherItem.updateMany({
            where: {
              ownerId: targetUserId,
              isDeleted: true,
              ...(matchingDeletedAt ? { deletedAt: matchingDeletedAt } : {}),
            },
            data: { isDeleted: false, deletedAt: null },
          }),
          tx.notification.create({
            data: {
              userId: targetUserId,
              title: "✅ تم رفع تقييد الحساب",
              message:
                body.message ||
                "تم رفع تقييد حسابك من قبل الإدارة ويمكنك استخدام المنصة مجدداً.",
              type: NotificationType.INFO,
            },
            select: { id: true },
          }),
        ]);

        return {
          userId: updatedUser.id,
          restoredListings:
            properties.count + newCars.count + oldCars.count + otherItems.count,
          notificationId: notification.id,
        };
      });

      return NextResponse.json(
        {
          success: true,
          ...unblockResult,
          message: t(
            `تم رفع الحظر عن المستخدم واستعادة ${unblockResult.restoredListings} من عناصره.`,
            `User unblocked and ${unblockResult.restoredListings} listings were restored.`,
          ),
        },
        { status: 200 },
      );
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

        await recordPlatformProfitLedgerEntries(tx, [
          {
            type: "MANUAL_REWARD_LIABILITY",
            amount: -amount,
            userId: targetUserId,
            referenceId: targetUserId,
            note: "Admin reward increased ready user liability",
          },
        ]);

        await tx.notification.create({
          data: {
            userId: targetUserId,
            title: "🎉 مكافأة مميزة",
            message:
              body.message ||
              `تمت إضافة مكافأة بقيمة ${amount}$ إلى رصيدك الجاهز للسحب تقديراً لنشاطك.`,
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
