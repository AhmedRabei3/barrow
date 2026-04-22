import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authHelper } from "../../utils/authHelper";
import { Errors } from "../../lib/errors/errors";
import { handleApiError } from "../../lib/errors/errorHandler";
import { attachExtrasBatch } from "../../items/functions/helpers";
import { requireProfileEditTicket } from "../../utils/profileEditVerification";
import { recordPlatformProfitLedgerEntries } from "@/lib/platformProfitLedger";
import { withTimeout } from "../../lib/errors/dbGuard";

const ITEM_RELATION_SELECT = {
  category: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
  location: {
    select: {
      latitude: true,
      longitude: true,
      address: true,
      city: true,
      country: true,
      state: true,
    },
  },
} as const;

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
    const [user, properties, newCars, oldCars, otherItems] = await withTimeout(
      Promise.all([
        prisma.user.findUnique({
          where: { id: session.id },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profileImage: true,
            createdAt: true,
            balance: true,
            isActive: true,
            activeUntil: true,
            pendingReferralEarnings: true,
            isIdentityVerified: true,
            isAdmin: true,
            isOwner: true,
            isDeleted: true,
            referrals: {
              select: {
                newUser: true,
              },
            },
            favorites: {
              select: {
                itemId: true,
                itemType: true,
              },
            },
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
        }),
        prisma.property.findMany({
          where: { ownerId: session.id, isDeleted: false },
          include: ITEM_RELATION_SELECT,
        }),
        prisma.newCar.findMany({
          where: { ownerId: session.id, isDeleted: false },
          include: ITEM_RELATION_SELECT,
        }),
        prisma.oldCar.findMany({
          where: { ownerId: session.id, isDeleted: false },
          include: ITEM_RELATION_SELECT,
        }),
        prisma.otherItem.findMany({
          where: { ownerId: session.id, isDeleted: false },
          include: ITEM_RELATION_SELECT,
        }),
      ]),
      8000,
      "Profile lookup timed out",
    );

    if (!user) throw Errors.UNAUTHORIZED();

    const invitedUserIds = user.referrals.map((referral) => referral.newUser);
    const activeInvitedCount = invitedUserIds.length
      ? await withTimeout(
          prisma.user.count({
            where: {
              id: { in: invitedUserIds },
              activeUntil: { gt: now },
              isDeleted: false,
            },
          }),
          5000,
          "Referral lookup timed out",
        )
      : 0;

    const items = [...newCars, ...oldCars, ...otherItems, ...properties];

    const propertyIds = properties.map((item) => item.id);
    const newCarIds = newCars.map((item) => item.id);
    const oldCarIds = oldCars.map((item) => item.id);
    const otherItemIds = otherItems.map((item) => item.id);

    const purchaseRequestsRaw =
      propertyIds.length ||
      newCarIds.length ||
      oldCarIds.length ||
      otherItemIds.length
        ? await withTimeout(
            prisma.purchaseRequest.findMany({
              where: {
                OR: [
                  ...(propertyIds.length
                    ? [
                        {
                          itemType: "PROPERTY" as const,
                          itemId: { in: propertyIds },
                        },
                      ]
                    : []),
                  ...(newCarIds.length
                    ? [
                        {
                          itemType: "NEW_CAR" as const,
                          itemId: { in: newCarIds },
                        },
                      ]
                    : []),
                  ...(oldCarIds.length
                    ? [
                        {
                          itemType: "USED_CAR" as const,
                          itemId: { in: oldCarIds },
                        },
                      ]
                    : []),
                  ...(otherItemIds.length
                    ? [
                        {
                          itemType: "OTHER" as const,
                          itemId: { in: otherItemIds },
                        },
                      ]
                    : []),
                ],
              },
              orderBy: { createdAt: "desc" },
              include: {
                buyer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    profileImage: true,
                  },
                },
              },
            }),
            8000,
            "Owner purchase requests lookup timed out",
          )
        : [];

    const itemsExtra = await withTimeout(
      attachExtrasBatch(items),
      8000,
      "Profile item enrichment timed out",
    );

    type EnrichedProfileItem = {
      id: string;
      category?: { type?: string | null };
      brand?: string | null;
      model?: string | null;
      title?: string | null;
      name?: string | null;
      images?: { url: string }[];
    };

    const enrichedItems = itemsExtra as EnrichedProfileItem[];

    const itemMetaByKey = new Map<
      string,
      { title: string; listingUrl: string; imageUrl: string | null }
    >();

    for (const item of enrichedItems) {
      const itemId = String(item?.id ?? "");
      const itemType = String(item?.category?.type ?? "");

      if (!itemId || !itemType) {
        continue;
      }

      const titleParts = [item?.brand, item?.model].filter(Boolean);
      const fallbackTitle = item?.title ?? item?.name ?? "Listing";
      const title = titleParts.length
        ? titleParts.join(" ")
        : String(fallbackTitle);

      itemMetaByKey.set(`${itemType}:${itemId}`, {
        title,
        listingUrl: `/items/details/${itemId}`,
        imageUrl:
          typeof item?.images?.[0]?.url === "string"
            ? item.images[0].url
            : null,
      });
    }

    const purchaseRequests = purchaseRequestsRaw.map((request) => {
      const key = `${request.itemType}:${request.itemId}`;
      const itemSummary = itemMetaByKey.get(key) ?? {
        title: "Listing",
        listingUrl: `/items/details/${request.itemId}`,
        imageUrl: null,
      };

      return {
        ...request,
        itemSummary,
      };
    });

    const safeUser = {
      ...user,
      password: undefined,
      items: itemsExtra,
      purchaseRequests,
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
