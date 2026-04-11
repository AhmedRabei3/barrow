import { ItemType, NotificationType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import { prisma } from "@/lib/prisma";

const ITEM_TYPES = [
  ItemType.PROPERTY,
  ItemType.NEW_CAR,
  ItemType.USED_CAR,
  ItemType.OTHER,
] as const;

type ModerationQueueItem = {
  id: string;
  type: ItemType;
  title: string;
  status: string;
  createdAt: string;
  moderationAction: string | null;
  moderationNote: string | null;
  moderatedAt: string | null;
  moderatedByName: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  categoryName: string;
  locationLabel: string;
  imageUrls: string[];
};

const isItemType = (value: string): value is ItemType =>
  ITEM_TYPES.includes(value as ItemType);

const buildLocationLabel = (
  location?: {
    city?: string | null;
    country?: string | null;
    address?: string | null;
  } | null,
) => {
  const parts = [location?.city, location?.country].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" - ");
  }
  return location?.address || "-";
};

const loadModeratorNames = async (moderatedByIds: Array<string | null>) => {
  const uniqueIds = Array.from(
    new Set(moderatedByIds.filter((value): value is string => Boolean(value))),
  );

  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const moderators = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true },
  });

  return new Map(moderators.map((moderator) => [moderator.id, moderator.name]));
};

const listPendingByType = async (
  itemType: ItemType,
  focusItemId?: string,
): Promise<ModerationQueueItem[]> => {
  switch (itemType) {
    case ItemType.PROPERTY: {
      const rows = await prisma.property.findMany({
        where: {
          isDeleted: false,
          status: "PENDING_REVIEW",
          ...(focusItemId ? { id: focusItemId } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          category: { select: { name: true } },
          location: { select: { city: true, country: true, address: true } },
        },
      });
      const moderatorNames = await loadModeratorNames(
        rows.map((row) => row.moderatedById),
      );
      const images = await prisma.itemImage.findMany({
        where: { itemType, itemId: { in: rows.map((row) => row.id) } },
        select: { itemId: true, url: true },
      });
      const imageMap = images.reduce<Record<string, string[]>>((acc, image) => {
        (acc[image.itemId] ||= []).push(image.url);
        return acc;
      }, {});
      return rows.map((row) => ({
        id: row.id,
        type: itemType,
        title: row.title,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        moderationAction: row.moderationAction,
        moderationNote: row.moderationNote,
        moderatedAt: row.moderatedAt?.toISOString() ?? null,
        moderatedByName: row.moderatedById
          ? (moderatorNames.get(row.moderatedById) ?? null)
          : null,
        owner: row.owner,
        categoryName: row.category.name,
        locationLabel: buildLocationLabel(row.location),
        imageUrls: imageMap[row.id] || [],
      }));
    }
    case ItemType.NEW_CAR: {
      const rows = await prisma.newCar.findMany({
        where: {
          isDeleted: false,
          status: "PENDING_REVIEW",
          ...(focusItemId ? { id: focusItemId } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          category: { select: { name: true } },
          location: { select: { city: true, country: true, address: true } },
        },
      });
      const moderatorNames = await loadModeratorNames(
        rows.map((row) => row.moderatedById),
      );
      const images = await prisma.itemImage.findMany({
        where: { itemType, itemId: { in: rows.map((row) => row.id) } },
        select: { itemId: true, url: true },
      });
      const imageMap = images.reduce<Record<string, string[]>>((acc, image) => {
        (acc[image.itemId] ||= []).push(image.url);
        return acc;
      }, {});
      return rows.map((row) => ({
        id: row.id,
        type: itemType,
        title: `${row.brand} ${row.model} ${row.year}`,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        moderationAction: row.moderationAction,
        moderationNote: row.moderationNote,
        moderatedAt: row.moderatedAt?.toISOString() ?? null,
        moderatedByName: row.moderatedById
          ? (moderatorNames.get(row.moderatedById) ?? null)
          : null,
        owner: row.owner,
        categoryName: row.category.name,
        locationLabel: buildLocationLabel(row.location),
        imageUrls: imageMap[row.id] || [],
      }));
    }
    case ItemType.USED_CAR: {
      const rows = await prisma.oldCar.findMany({
        where: {
          isDeleted: false,
          status: "PENDING_REVIEW",
          ...(focusItemId ? { id: focusItemId } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          category: { select: { name: true } },
          location: { select: { city: true, country: true, address: true } },
        },
      });
      const moderatorNames = await loadModeratorNames(
        rows.map((row) => row.moderatedById),
      );
      const images = await prisma.itemImage.findMany({
        where: { itemType, itemId: { in: rows.map((row) => row.id) } },
        select: { itemId: true, url: true },
      });
      const imageMap = images.reduce<Record<string, string[]>>((acc, image) => {
        (acc[image.itemId] ||= []).push(image.url);
        return acc;
      }, {});
      return rows.map((row) => ({
        id: row.id,
        type: itemType,
        title: `${row.brand} ${row.model} ${row.year}`,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        moderationAction: row.moderationAction,
        moderationNote: row.moderationNote,
        moderatedAt: row.moderatedAt?.toISOString() ?? null,
        moderatedByName: row.moderatedById
          ? (moderatorNames.get(row.moderatedById) ?? null)
          : null,
        owner: row.owner,
        categoryName: row.category.name,
        locationLabel: buildLocationLabel(row.location),
        imageUrls: imageMap[row.id] || [],
      }));
    }
    case ItemType.OTHER: {
      const rows = await prisma.otherItem.findMany({
        where: {
          isDeleted: false,
          status: "PENDING_REVIEW",
          ...(focusItemId ? { id: focusItemId } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          category: { select: { name: true } },
          location: { select: { city: true, country: true, address: true } },
        },
      });
      const moderatorNames = await loadModeratorNames(
        rows.map((row) => row.moderatedById),
      );
      const images = await prisma.itemImage.findMany({
        where: { itemType, itemId: { in: rows.map((row) => row.id) } },
        select: { itemId: true, url: true },
      });
      const imageMap = images.reduce<Record<string, string[]>>((acc, image) => {
        (acc[image.itemId] ||= []).push(image.url);
        return acc;
      }, {});
      return rows.map((row) => ({
        id: row.id,
        type: itemType,
        title: row.name,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        moderationAction: row.moderationAction,
        moderationNote: row.moderationNote,
        moderatedAt: row.moderatedAt?.toISOString() ?? null,
        moderatedByName: row.moderatedById
          ? (moderatorNames.get(row.moderatedById) ?? null)
          : null,
        owner: row.owner,
        categoryName: row.category.name,
        locationLabel: buildLocationLabel(row.location),
        imageUrls: imageMap[row.id] || [],
      }));
    }
  }
};

const getItemOwner = async (itemType: ItemType, itemId: string) => {
  switch (itemType) {
    case ItemType.PROPERTY:
      return prisma.property.findUnique({
        where: { id: itemId },
        select: { ownerId: true, title: true },
      });
    case ItemType.NEW_CAR:
      return prisma.newCar.findUnique({
        where: { id: itemId },
        select: { ownerId: true, brand: true, model: true },
      });
    case ItemType.USED_CAR:
      return prisma.oldCar.findUnique({
        where: { id: itemId },
        select: { ownerId: true, brand: true, model: true },
      });
    case ItemType.OTHER:
      return prisma.otherItem.findUnique({
        where: { id: itemId },
        select: { ownerId: true, name: true },
      });
  }
};

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    await requireAdminUser();
    const rawType = String(
      req.nextUrl.searchParams.get("type") || "ALL",
    ).toUpperCase();
    const focusItemId = String(
      req.nextUrl.searchParams.get("itemId") || "",
    ).trim();
    const pageParam = Number(req.nextUrl.searchParams.get("page") || 1);
    const limitParam = Number(req.nextUrl.searchParams.get("limit") || 12);
    const page = Number.isFinite(pageParam)
      ? Math.max(1, Math.floor(pageParam))
      : 1;
    const limit = Number.isFinite(limitParam)
      ? Math.min(30, Math.max(6, Math.floor(limitParam)))
      : 12;
    const typesToLoad = isItemType(rawType) ? [rawType] : [...ITEM_TYPES];

    const groupedRows = await Promise.all(
      typesToLoad.map((type) =>
        listPendingByType(type, focusItemId || undefined),
      ),
    );
    const allRows = groupedRows
      .flat()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    const summary = ITEM_TYPES.map((type) => ({
      type,
      count: allRows.filter((row) => row.type === type).length,
    }));
    const totalItems = allRows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * limit;

    return NextResponse.json({
      success: true,
      message: t("تم تحميل طابور المراجعة", "Moderation queue loaded"),
      filters: {
        type: isItemType(rawType) ? rawType : "ALL",
      },
      summary,
      pagination: {
        page: currentPage,
        limit,
        totalItems,
        totalPages,
      },
      items: allRows.slice(start, start + limit),
    });
  } catch (error) {
    console.error("Failed to load image moderation queue:", error);
    return NextResponse.json(
      {
        success: false,
        message: t(
          "تعذر تحميل طابور المراجعة",
          "Failed to load moderation queue",
        ),
      },
      { status: 401 },
    );
  }
}

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const admin = await requireAdminUser();
    const body = (await req.json()) as {
      action?: "APPROVE" | "REJECT";
      itemId?: string;
      itemType?: ItemType;
      note?: string;
    };

    if (
      !body.action ||
      !body.itemId ||
      !body.itemType ||
      !isItemType(body.itemType)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: t(
            "بيانات المراجعة غير مكتملة",
            "Incomplete moderation request",
          ),
        },
        { status: 400 },
      );
    }

    const itemOwner = await getItemOwner(body.itemType, body.itemId);
    if (!itemOwner?.ownerId) {
      return NextResponse.json(
        { success: false, message: t("العنصر غير موجود", "Item not found") },
        { status: 404 },
      );
    }

    const approved = body.action === "APPROVE";
    const moderationNote = body.note?.trim() || null;
    const moderationData = {
      status: approved ? "AVAILABLE" : "MAINTENANCE",
      moderationAction: body.action,
      moderationNote,
      moderatedAt: new Date(),
      moderatedById: admin.id,
    } as const;
    await prisma.$transaction(async (tx) => {
      switch (body.itemType) {
        case ItemType.PROPERTY:
          await tx.property.update({
            where: { id: body.itemId },
            data: moderationData,
          });
          break;
        case ItemType.NEW_CAR:
          await tx.newCar.update({
            where: { id: body.itemId },
            data: moderationData,
          });
          break;
        case ItemType.USED_CAR:
          await tx.oldCar.update({
            where: { id: body.itemId },
            data: moderationData,
          });
          break;
        case ItemType.OTHER:
          await tx.otherItem.update({
            where: { id: body.itemId },
            data: moderationData,
          });
          break;
      }

      await tx.notification.create({
        data: {
          userId: itemOwner.ownerId,
          title: approved
            ? t("✅ تمت الموافقة على صور العنصر", "✅ Item images approved")
            : t(
                "⚠️ تحتاج صور العنصر إلى تعديل",
                "⚠️ Item images need revision",
              ),
          message: approved
            ? t(
                "تمت مراجعة صور عنصرِك وأصبح الإعلان منشوراً الآن.",
                "Your item images were reviewed and the listing is now published.",
              )
            : body.note?.trim() ||
              t(
                "لم تتم الموافقة على الصور الحالية. حدّث الصور ثم أعد الإرسال للمراجعة.",
                "The current images were not approved. Update them and resubmit for review.",
              ),
          type: approved ? NotificationType.INFO : NotificationType.WARNING,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: approved
        ? t("تمت الموافقة على العنصر ونشره", "Item approved and published")
        : t(
            "تم رفض الصور وإبقاء العنصر مخفياً",
            "Images rejected and item kept hidden",
          ),
    });
  } catch (error) {
    console.error("Failed to moderate item images:", error);
    return NextResponse.json(
      {
        success: false,
        message: t(
          "تعذر تنفيذ إجراء المراجعة",
          "Failed to process moderation action",
        ),
      },
      { status: 500 },
    );
  }
}
