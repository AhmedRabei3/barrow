import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authHelper } from "../../utils/authHelper";
import { Errors } from "../../lib/errors/errors";
import { handleApiError } from "../../lib/errors/errorHandler";
import { attachExtrasBatch } from "../../items/functions/helpers";
import { requireProfileEditTicket } from "../../utils/profileEditVerification";
import { recordPlatformProfitLedgerEntries } from "@/lib/platformProfitLedger";

/**
 * @description Get user profile
 * @route ~/api/profile
 * @method Get
 * @access Public
 */

export async function GET(req: NextRequest) {
  try {
    const session = await authHelper();
    const now = new Date();
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        properties: {
          where: { isDeleted: false },
          include: { category: true, location: true },
        },
        newCars: {
          where: { isDeleted: false },
          include: { category: true, location: true },
        },
        oldCars: {
          where: { isDeleted: false },
          include: { category: true, location: true },
        },
        otherItems: {
          where: { isDeleted: false },
          include: { category: true, location: true },
        },
        favorites: true,
        referrals: true,
        purchaseRequests: true,
        identityVerificationRequest: {
          select: {
            id: true,
            fullName: true,
            nationalId: true,
            frontImageUrl: true,
            backImageUrl: true,
            status: true,
            adminNote: true,
            createdAt: true,
            updatedAt: true,
            reviewedAt: true,
          },
        },
      },
    });
    if (!user) throw Errors.UNAUTHORIZED();

    const invitedUserIds = user.referrals.map((referral) => referral.newUser);
    const activeInvitedCount = invitedUserIds.length
      ? await prisma.user.count({
          where: {
            id: { in: invitedUserIds },
            activeUntil: { gt: now },
            isDeleted: false,
          },
        })
      : 0;

    const items = [
      ...user.newCars,
      ...user.oldCars,
      ...user.otherItems,
      ...user.properties,
    ];

    const itemsExtra = await attachExtrasBatch(items);
    const safeUser = {
      ...user,
      password: undefined,
      items: itemsExtra,
      referralStats: {
        invitedCount: invitedUserIds.length,
        activeInvitedCount,
        inactiveInvitedCount: Math.max(
          invitedUserIds.length - activeInvitedCount,
          0,
        ),
      },
    };
    return NextResponse.json(safeUser, { status: 200 });
  } catch (error) {
    return handleApiError(error, req);
  }
}

/**
 * @description Upload user profile image
 * @route ~/api/profile/:id
 * @method POST
 * @access private
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authHelper();
    const id = user?.id;

    const body = await req.json();
    const { profileImage } = body as { profileImage: string };
    if (!profileImage)
      return NextResponse.json({ message: "الصور مطلوبة" }, { status: 400 });
    await prisma.user.update({
      where: { id },
      data: { profileImage },
    });
    return NextResponse.json(
      { message: "تم تحديث صورة الملف الشخصي بنجاح" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ message: "حدث خطأ داخلي في الخادم" });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * @description Charge Acoount balance by code
 * @route ~/api/profile
 * @method PUT
 * @access private (owner Of account only)
 */

export async function PUT(req: NextRequest) {
  try {
    const user = await authHelper();
    const id = user?.id;

    const body = await req.json();
    const { code } = body || {};

    if (!code) {
      return NextResponse.json(
        { success: false, message: "كود التفعيل مطلوب" },
        { status: 400 },
      );
    }

    // ✅ التحقق من وجود كود التفعيل
    const existingCode = await prisma.activationCode.findUnique({
      where: { code },
    });

    if (!existingCode) {
      return NextResponse.json(
        { success: false, message: "كود التفعيل غير صالح أو منتهي" },
        { status: 400 },
      );
    }

    // ✅ تنفيذ جميع العمليات في معاملة واحدة
    const { updatedUser, transactionLog } = await prisma.$transaction(
      async (tx) => {
        const updatedUser = await tx.user.update({
          where: { id },
          data: { balance: { increment: existingCode.balance } },
          select: { id: true, balance: true },
        });

        await tx.activationCode.delete({ where: { code: existingCode.code } });

        const transactionLog = await tx.chargingLog.create({
          data: {
            userId: id,
            type: "CREDIT",
            amount: existingCode.balance,
          },
        });

        await recordPlatformProfitLedgerEntries(tx, [
          {
            type: "ACTIVATION_CODE_LIABILITY",
            amount: -Number(existingCode.balance ?? 0),
            userId: id,
            referenceId: existingCode.id,
            note: "Activation code redemption increased ready user liability",
          },
        ]);

        return { updatedUser, transactionLog };
      },
    );

    // ✅ إرجاع الاستجابة النهائية
    return NextResponse.json({
      success: true,
      message: "تم تحديث الرصيد بنجاح",
      data: {
        user: updatedUser,
        transaction: transactionLog,
      },
    });
  } catch (error) {
    console.error("❌ Error in PUT /api/user/[id]:", error);
    return handleApiError(error, req);
  }
}

/**
 * @description Update user basic profile data (name/email)
 * @route ~/api/profile
 * @method PATCH
 * @access private
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await authHelper();
    const userId = session.id;
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!currentUser) {
      throw Errors.UNAUTHORIZED();
    }

    const body = (await req.json()) as {
      name?: string;
      email?: string;
      phone?: string | null;
    };

    const nextName = body?.name?.trim();
    const nextEmail = body?.email?.trim().toLowerCase();
    const normalizedPhone =
      typeof body?.phone === "string"
        ? body.phone.trim()
        : body?.phone === null
          ? null
          : undefined;

    if (!nextName && !nextEmail && normalizedPhone === undefined) {
      return NextResponse.json(
        { success: false, message: "لا توجد بيانات للتحديث" },
        { status: 400 },
      );
    }

    requireProfileEditTicket(req, {
      userId,
      email: currentUser.email,
    });

    if (nextName && nextName.length < 2) {
      return NextResponse.json(
        { success: false, message: "الاسم قصير جدًا" },
        { status: 400 },
      );
    }

    if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return NextResponse.json(
        { success: false, message: "صيغة البريد الإلكتروني غير صحيحة" },
        { status: 400 },
      );
    }

    if (
      normalizedPhone !== undefined &&
      normalizedPhone !== null &&
      normalizedPhone.length > 0 &&
      !/^\+?[1-9]\d{7,14}$/.test(normalizedPhone)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "رقم الهاتف غير صالح، استخدم صيغة دولية مثل +49123456789",
        },
        { status: 400 },
      );
    }

    if (nextEmail) {
      const emailOwner = await prisma.user.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });

      if (emailOwner && emailOwner.id !== userId) {
        return NextResponse.json(
          { success: false, message: "البريد الإلكتروني مستخدم بالفعل" },
          { status: 409 },
        );
      }
    }

    if (normalizedPhone !== undefined && normalizedPhone !== null) {
      const phoneOwner = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
        select: { id: true },
      });

      if (phoneOwner && phoneOwner.id !== userId) {
        return NextResponse.json(
          { success: false, message: "رقم الهاتف مستخدم بالفعل" },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(nextName ? { name: nextName } : {}),
        ...(nextEmail ? { email: nextEmail } : {}),
        ...(normalizedPhone !== undefined
          ? { phone: normalizedPhone || null }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profileImage: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث بيانات الحساب بنجاح",
      user: updated,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}
