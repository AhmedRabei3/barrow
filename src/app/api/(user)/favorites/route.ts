import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelper } from "../../utils/authHelper";
import { $Enums } from "@prisma/client";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

const isItemType = (value: string): value is $Enums.ItemType => {
  return ["NEW_CAR", "USED_CAR", "PROPERTY", "OTHER"].includes(value);
};

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  try {
    const user = await authHelper();
    const itemId = req.nextUrl.searchParams.get("itemId");
    const itemType = req.nextUrl.searchParams.get("itemType");

    if (itemId && itemType && isItemType(itemType)) {
      const found = await prisma.favoratedItem.findUnique({
        where: {
          userId_itemId_itemType: {
            userId: user.id,
            itemId,
            itemType,
          },
        },
        select: { id: true },
      });

      return NextResponse.json({ isFavorite: Boolean(found) }, { status: 200 });
    }

    const favorites = await prisma.favoratedItem.findMany({
      where: { userId: user.id },
      select: { itemId: true, itemType: true },
    });

    return NextResponse.json({ favorites }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: localizeErrorMessage("Unauthorized", isArabic) },
      { status: 401 },
    );
  }
}

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  try {
    const user = await authHelper();
    const body = (await req.json()) as { itemId?: string; itemType?: string };

    if (!body.itemId || !body.itemType || !isItemType(body.itemType)) {
      return NextResponse.json(
        { message: localizeErrorMessage("Invalid payload", isArabic) },
        { status: 400 },
      );
    }

    await prisma.favoratedItem.upsert({
      where: {
        userId_itemId_itemType: {
          userId: user.id,
          itemId: body.itemId,
          itemType: body.itemType,
        },
      },
      update: {},
      create: {
        userId: user.id,
        itemId: body.itemId,
        itemType: body.itemType,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: localizeErrorMessage("Unauthorized", isArabic) },
      { status: 401 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  try {
    const user = await authHelper();
    const body = (await req.json()) as { itemId?: string; itemType?: string };

    if (!body.itemId || !body.itemType || !isItemType(body.itemType)) {
      return NextResponse.json(
        { message: localizeErrorMessage("Invalid payload", isArabic) },
        { status: 400 },
      );
    }

    await prisma.favoratedItem.deleteMany({
      where: {
        userId: user.id,
        itemId: body.itemId,
        itemType: body.itemType,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: localizeErrorMessage("Unauthorized", isArabic) },
      { status: 401 },
    );
  }
}
