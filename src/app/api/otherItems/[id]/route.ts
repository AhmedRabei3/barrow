import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateOtherItemSchema } from "@/app/validations";
import { requireActiveUser } from "../../utils/authHelper";
import { Errors } from "../../lib/errors/errors";
import { normEnum, toNumber } from "../../utils/utils";
import { handleApiError } from "../../lib/errors/errorHandler";
import {
  parseManualRentalPeriods,
  syncManualRentalStatus,
} from "../../utils/manualRentalStatus";
import { Availability, TransactionType, type RentType } from "@prisma/client";
import {
  notifyAdminsOfModerationQueue,
  pendingReviewData,
} from "../../utils/moderation";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * @description Update other item
 * @access Private
 * @route PATCH ~/api/other/:id
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const owner = await requireActiveUser();

  try {
    const { id } = await params;
    if (!id) {
      throw Errors.VALIDATION("معرّف العنصر مطلوب");
    }

    // 🔎 التحقق من وجود العنصر وملكيته
    const item = await prisma.otherItem.findFirst({
      where: {
        id,
        ownerId: owner.id,
        isDeleted: false,
      },
    });

    if (!item) {
      throw Errors.NOT_FOUND();
    }

    const formData = await req.formData();

    const sellOrRent = formData.get("sellOrRent")
      ? normEnum(formData.get("sellOrRent"))
      : undefined;

    const rawData = {
      name: formData.get("name") ?? undefined,
      brand: formData.get("brand") ?? undefined,
      description: formData.get("description") ?? undefined,
      price: toNumber(formData.get("price")),

      sellOrRent,
      rentType:
        sellOrRent === "RENT"
          ? normEnum(formData.get("rentType"))
          : sellOrRent === "SELL"
            ? null
            : undefined,

      status: formData.get("status")
        ? normEnum(formData.get("status"))
        : undefined,

      // 📍 الموقع (اختياري)
      latitude: toNumber(formData.get("latitude")),
      longitude: toNumber(formData.get("longitude")),
      city: formData.get("city")?.toString(),
      address: formData.get("address")?.toString(),
      state: formData.get("state")?.toString(),
      country: formData.get("country")?.toString(),
    };

    const manualRentalPeriods = parseManualRentalPeriods(
      formData.get("manualRentalPeriods"),
    );

    // 🧪 Validation
    const parsed = updateOtherItemSchema.safeParse(rawData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw Errors.VALIDATION(issue.message, issue.path.join("."));
    }

    const { latitude, longitude, city, address, state, country, ...itemData } =
      parsed.data;

    const { updatedItem, manualRentalEndsAt } = await prisma.$transaction(
      async (tx) => {
        const nextStatus = (itemData.status ?? item.status) as Availability;
        const nextSellOrRent = (itemData.sellOrRent ??
          item.sellOrRent) as TransactionType;
        const nextRentType = (
          itemData.rentType !== undefined ? itemData.rentType : item.rentType
        ) as RentType | null;

        // 🧾 تحديث العنصر
        const updated = await tx.otherItem.update({
          where: { id },
          data: {
            ...itemData,
          },
        });

        // 📍 تحديث الموقع (إن تم إرسال أي قيمة)
        const hasLocationUpdate = [
          latitude,
          longitude,
          city,
          address,
          state,
          country,
        ].some((v) => v !== undefined);

        if (hasLocationUpdate) {
          await tx.location.update({
            where: { otherItemId: id },
            data: {
              latitude,
              longitude,
              city,
              address,
              state,
              country,
            },
          });
        }

        const manualRentalState = await syncManualRentalStatus({
          tx,
          itemId: id,
          itemType: "OTHER",
          ownerId: owner.id,
          nextStatus,
          nextSellOrRent,
          nextRentType,
          manualRentalPeriods,
        });

        return {
          updatedItem: updated,
          manualRentalEndsAt: manualRentalState.manualRentalEndsAt,
        };
      },
    );

    return NextResponse.json(
      {
        success: true,
        item: updatedItem,
        listingState: {
          status: updatedItem.status,
          sellOrRent: updatedItem.sellOrRent,
          rentType: updatedItem.rentType,
          manualRentalEndsAt: manualRentalEndsAt?.toISOString() ?? null,
        },
        message: "تم تحديث العنصر بنجاح",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("UPDATE OTHER ITEM ERROR:", error);
    return handleApiError(error, req);
  }
}

/**
 * @description Delete other item (soft delete)
 * @access Private
 * @route DELETE ~/api/other/:id
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const owner = await requireActiveUser();

  try {
    const { id } = await params;
    if (!id) {
      throw Errors.VALIDATION("معرّف العنصر مطلوب");
    }

    // 🔎 التحقق من وجود العنصر وملكيته
    const item = await prisma.otherItem.findFirst({
      where: {
        id,
        ownerId: owner.id,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!item) {
      throw Errors.NOT_FOUND();
    }

    await prisma.$transaction(async (tx) => {
      // 🖼 حذف الصور
      await tx.itemImage.deleteMany({
        where: { itemId: id },
      });

      // ⭐ حذف المراجعات (إن وُجدت)
      await tx.review.deleteMany({
        where: { itemId: id },
      });

      // 📍 حذف الموقع
      await tx.location.deleteMany({
        where: { otherItemId: id },
      });

      // 🗑 Soft Delete للعنصر
      await tx.otherItem.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "تم حذف العنصر بنجاح",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE OTHER ITEM ERROR:", error);
    return handleApiError(error, req);
  }
}
