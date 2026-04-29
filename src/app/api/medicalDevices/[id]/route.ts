import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateMedicalDeviceSchema } from "@/app/validations";
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
  deleteListingIndex,
  upsertListingIndex,
} from "@/server/services/listing-index.service";

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

    const item = await prisma.medicalDevice.findFirst({
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
      manufacturer: formData.get("manufacturer") ?? undefined,
      model: formData.get("model") ?? undefined,
      description: formData.get("description") ?? undefined,
      deviceFunction: formData.get("deviceFunction") ?? undefined,
      manufactureYear: toNumber(formData.get("manufactureYear")),
      condition: formData.get("condition") ?? undefined,
      dimensions: formData.get("dimensions") ?? undefined,
      weight: formData.get("weight") ?? undefined,
      manufacturerPlace: formData.get("manufacturerPlace") ?? undefined,
      isUsed: toOptionalBoolean(formData.get("isUsed")),
      warrantyMonths: toNumber(formData.get("warrantyMonths")),
      usageHours: toNumber(formData.get("usageHours")),
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
    const parsed = updateMedicalDeviceSchema.safeParse(rawData);
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

        const updated = await tx.medicalDevice.update({
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
            where: { medicalDeviceId: id },
            data: { latitude, longitude, city, address, state, country },
          });
        }

        const manualRentalState = await syncManualRentalStatus({
          tx,
          itemId: id,
          itemType: "MEDICAL_DEVICE",
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

    void upsertListingIndex(id, "MEDICAL_DEVICE");

    return NextResponse.json({
      success: true,
      item: updatedItem,
      listingState: {
        status: updatedItem.status,
        sellOrRent: updatedItem.sellOrRent,
        rentType: updatedItem.rentType,
        manualRentalEndsAt: manualRentalEndsAt?.toISOString() ?? null,
      },
      message: "تم تحديث الجهاز الطبي بنجاح",
    });
  } catch (error) {
    console.error("UPDATE MEDICAL DEVICE ERROR:", error);
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

    const item = await prisma.medicalDevice.findFirst({
      where: { id, ownerId: owner.id, isDeleted: false },
      select: { id: true },
    });

    if (!item) {
      throw Errors.NOT_FOUND();
    }

    await prisma.$transaction(async (tx) => {
      await tx.itemImage.deleteMany({ where: { itemId: id } });
      await tx.review.deleteMany({ where: { itemId: id } });
      await tx.location.deleteMany({ where: { medicalDeviceId: id } });
      await tx.medicalDevice.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    void deleteListingIndex(id);

    return NextResponse.json({
      success: true,
      message: "تم حذف الجهاز الطبي بنجاح",
    });
  } catch (error) {
    console.error("DELETE MEDICAL DEVICE ERROR:", error);
    return handleApiError(error, req);
  }
}
