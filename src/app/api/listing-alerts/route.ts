import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ItemType, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/app/api/utils/authHelper";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { CACHE_HEADERS } from "@/app/api/lib/cacheHeaders";
import { createHash } from "crypto";

const roundCoord = (value: number) => Number(value.toFixed(4));

const buildAlertSignature = (input: {
  userId: string;
  itemType?: ItemType | null;
  categoryId?: string | null;
  action?: TransactionType | null;
  lat: number;
  lng: number;
  radiusKm: number;
}) =>
  createHash("md5")
    .update(
      JSON.stringify({
        userId: input.userId,
        itemType: input.itemType ?? null,
        categoryId: input.categoryId ?? null,
        action: input.action ?? null,
        lat: roundCoord(input.lat),
        lng: roundCoord(input.lng),
        radiusKm: Number(input.radiusKm.toFixed(2)),
      }),
    )
    .digest("hex");

const createListingAlertSchema = z.object({
  id: z.string().trim().min(1).optional(),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  radiusKm: z.number().finite().positive().max(250),
  itemType: z.nativeEnum(ItemType).optional().nullable(),
  action: z.nativeEnum(TransactionType).optional().nullable(),
  catName: z.string().trim().max(120).optional().nullable(),
  isEnabled: z.boolean().optional(),
});

const resolveAlertCategory = async (catName?: string | null) => {
  const normalizedCategoryName = catName?.trim();
  const shouldResolveCategory =
    normalizedCategoryName && normalizedCategoryName !== "All";

  if (!shouldResolveCategory) {
    return null;
  }

  return prisma.category.findFirst({
    where: {
      isDeleted: false,
      OR: [
        { name: { equals: normalizedCategoryName, mode: "insensitive" } },
        { nameAr: { equals: normalizedCategoryName, mode: "insensitive" } },
        { nameEn: { equals: normalizedCategoryName, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, nameAr: true, nameEn: true },
  });
};

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const user = await requireActiveUser();
    const payload = createListingAlertSchema.parse(await req.json());

    const category = await resolveAlertCategory(payload.catName ?? null);

    const signature = buildAlertSignature({
      userId: user.id,
      itemType: payload.itemType ?? null,
      categoryId: category?.id ?? null,
      action: payload.action ?? null,
      lat: payload.lat,
      lng: payload.lng,
      radiusKm: payload.radiusKm,
    });

    await prisma.listingAvailabilityAlert.upsert({
      where: { signature },
      create: {
        signature,
        userId: user.id,
        centerLat: payload.lat,
        centerLng: payload.lng,
        radiusKm: payload.radiusKm,
        itemType: payload.itemType ?? null,
        sellOrRent: payload.action ?? null,
        categoryId: category?.id ?? null,
      },
      update: {
        centerLat: payload.lat,
        centerLng: payload.lng,
        radiusKm: payload.radiusKm,
        itemType: payload.itemType ?? null,
        sellOrRent: payload.action ?? null,
        categoryId: category?.id ?? null,
        isEnabled: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: t(
          "تم تفعيل التنبيه بنجاح، سنعلمك عند توفر عنصر جديد مطابق ضمن هذا النطاق.",
          "Alert enabled successfully. We will notify you when a matching listing appears in this area.",
        ),
      },
      {
        headers: {
          "Cache-Control": CACHE_HEADERS.privateNoStore,
        },
      },
    );
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireActiveUser();

    const alerts = await prisma.listingAvailabilityAlert.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        itemType: true,
        categoryId: true,
        sellOrRent: true,
        centerLat: true,
        centerLng: true,
        radiusKm: true,
        isEnabled: true,
        createdAt: true,
        updatedAt: true,
        lastMatchAt: true,
        category: {
          select: { name: true, nameAr: true, nameEn: true },
        },
      },
    });

    return NextResponse.json(
      { data: alerts },
      { headers: { "Cache-Control": CACHE_HEADERS.privateNoStore } },
    );
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function PATCH(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const user = await requireActiveUser();
    const payload = createListingAlertSchema.parse(await req.json());

    if (!payload.id) {
      return NextResponse.json({ message: "id is required" }, { status: 400 });
    }

    const existing = await prisma.listingAvailabilityAlert.findFirst({
      where: { id: payload.id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ message: "Alert not found" }, { status: 404 });
    }

    const category = await resolveAlertCategory(payload.catName ?? null);
    const signature = buildAlertSignature({
      userId: user.id,
      itemType: payload.itemType ?? null,
      categoryId: category?.id ?? null,
      action: payload.action ?? null,
      lat: payload.lat,
      lng: payload.lng,
      radiusKm: payload.radiusKm,
    });

    const duplicate = await prisma.listingAvailabilityAlert.findFirst({
      where: {
        signature,
        userId: user.id,
        id: { not: payload.id },
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          message: t(
            "يوجد تنبيه آخر بنفس الإعدادات بالفعل",
            "Another alert with the same settings already exists",
          ),
        },
        { status: 409 },
      );
    }

    await prisma.listingAvailabilityAlert.update({
      where: { id: payload.id },
      data: {
        signature,
        centerLat: payload.lat,
        centerLng: payload.lng,
        radiusKm: payload.radiusKm,
        itemType: payload.itemType ?? null,
        sellOrRent: payload.action ?? null,
        categoryId: category?.id ?? null,
        isEnabled: payload.isEnabled ?? true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: t("تم تحديث التنبيه بنجاح", "Alert updated successfully"),
      },
      {
        headers: {
          "Cache-Control": CACHE_HEADERS.privateNoStore,
        },
      },
    );
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireActiveUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "id is required" }, { status: 400 });
    }

    await prisma.listingAvailabilityAlert.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": CACHE_HEADERS.privateNoStore } },
    );
  } catch (error) {
    return handleApiError(error, req);
  }
}
