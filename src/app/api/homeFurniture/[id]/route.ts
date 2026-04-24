import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateHomeFurnitureSchema } from "@/app/validations";
import { requireActiveUser } from "../../utils/authHelper";
import { Errors } from "../../lib/errors/errors";
import { normEnum, toNumber } from "../../utils/utils";
import { handleApiError } from "../../lib/errors/errorHandler";
import {
  parseManualRentalPeriods,
  syncManualRentalStatus,
} from "../../utils/manualRentalStatus";
import { Availability, TransactionType, type RentType } from "@prisma/client";

const toOptionalBoolean = (value: FormDataEntryValue | null) => {
  if (value === null || value === "") return undefined;
  return String(value) === "true";
};

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const owner = await requireActiveUser();

  try {
    const { id } = await params;
    if (!id) {
      throw Errors.VALIDATION("معرّف العنصر مطلوب");
    }

    const item = await prisma.homeFurniture.findFirst({
      where: { id, ownerId: owner.id, isDeleted: false },
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
      furnitureType: formData.get("furnitureType") ?? undefined,
      condition: formData.get("condition") ?? undefined,
      material: formData.get("material") ?? undefined,
      roomType: formData.get("roomType") ?? undefined,
      dimensions: formData.get("dimensions") ?? undefined,
      color: formData.get("color") ?? undefined,
      assemblyIncluded: toOptionalBoolean(formData.get("assemblyIncluded")),
      isUsed: toOptionalBoolean(formData.get("isUsed")),
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
    const parsed = updateHomeFurnitureSchema.safeParse(rawData);
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

        const updated = await tx.homeFurniture.update({
          where: { id },
          data: { ...itemData },
        });

        const hasLocationUpdate = [
          latitude,
          longitude,
          city,
          address,
          state,
          country,
        ].some((value) => value !== undefined);

        if (hasLocationUpdate) {
          await tx.location.update({
            where: { homeFurnitureId: id },
            data: { latitude, longitude, city, address, state, country },
          });
        }

        const manualRentalState = await syncManualRentalStatus({
          tx,
          itemId: id,
          itemType: "HOME_FURNITURE",
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

    return NextResponse.json({
      success: true,
      item: updatedItem,
      listingState: {
        status: updatedItem.status,
        sellOrRent: updatedItem.sellOrRent,
        rentType: updatedItem.rentType,
        manualRentalEndsAt: manualRentalEndsAt?.toISOString() ?? null,
      },
      message: "تم تحديث الأثاث بنجاح",
    });
  } catch (error) {
    console.error("UPDATE HOME FURNITURE ERROR:", error);
    return handleApiError(error, req);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const owner = await requireActiveUser();

  try {
    const { id } = await params;
    if (!id) {
      throw Errors.VALIDATION("معرّف العنصر مطلوب");
    }

    const item = await prisma.homeFurniture.findFirst({
      where: { id, ownerId: owner.id, isDeleted: false },
      select: { id: true },
    });

    if (!item) {
      throw Errors.NOT_FOUND();
    }

    await prisma.$transaction(async (tx) => {
      await tx.itemImage.deleteMany({ where: { itemId: id } });
      await tx.review.deleteMany({ where: { itemId: id } });
      await tx.location.deleteMany({ where: { homeFurnitureId: id } });
      await tx.homeFurniture.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    return NextResponse.json({ success: true, message: "تم حذف الأثاث بنجاح" });
  } catch (error) {
    console.error("DELETE HOME FURNITURE ERROR:", error);
    return handleApiError(error, req);
  }
}
