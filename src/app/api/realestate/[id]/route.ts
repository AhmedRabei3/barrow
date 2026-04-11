import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "../../utils/authHelper";
import { Errors } from "../../lib/errors/errors";
import { handleApiError } from "../../lib/errors/errorHandler";
import { normEnum, toBool, toNumber } from "../../utils/utils";
import { updatePropertySchema } from "@/app/validations";
import {
  parseManualRentalPeriods,
  syncManualRentalStatus,
} from "../../utils/manualRentalStatus";
import { Availability, TransactionType, type RentType } from "@prisma/client";
import {
  notifyAdminsOfModerationQueue,
  pendingReviewData,
} from "../../utils/moderation";

/**
 * @description Delete property (soft delete) and remove all related data
 * @access Private
 * @route DELETE ~/api/realestate/:id
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await requireActiveUser();

  try {
    const { id } = await params;

    if (!id) {
      throw Errors.VALIDATION("معرّف العقار مطلوب");
    }

    // 🔎 التحقق من وجود العقار وملكيته
    const property = await prisma.property.findFirst({
      where: {
        id,
        ownerId: owner.id,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!property) {
      throw Errors.NOT_FOUND();
    }

    await prisma.$transaction(async (tx) => {
      // 🗑 حذف الصور
      await tx.itemImage.deleteMany({
        where: { itemId: id },
      });

      // 🗑 حذف المراجعات
      await tx.review.deleteMany({
        where: { itemId: id },
      });

      // 🗑 حذف الموقع
      await tx.location.delete({
        where: { propertyId: id },
      });

      // 🚫 Soft delete للعقار
      await tx.property.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "تم حذف العقار بنجاح",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE PROPERTY ERROR:", error);
    return handleApiError(error, req);
  }
}

/**
 * @description Update property
 * @access Private
 * @route PATCH ~/api/realestate/:id
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await requireActiveUser();

  try {
    const { id } = await params;
    if (!id) {
      throw Errors.VALIDATION("معرّف العقار مطلوب");
    }

    // 🔎 التحقق من وجود العقار وملكيته
    const property = await prisma.property.findFirst({
      where: {
        id,
        ownerId: owner.id,
        isDeleted: false,
      },
    });

    if (!property) {
      throw Errors.NOT_FOUND();
    }

    const formData = await req.formData();

    const sellOrRent = formData.get("sellOrRent")
      ? normEnum(formData.get("sellOrRent"))
      : undefined;

    const rawDirection =
      formData.get("direction") ?? formData.get("directions");

    const rawData = {
      id,

      title: formData.get("title") ?? undefined,
      description: formData.get("description") ?? undefined,
      price: toNumber(formData.get("price")),
      guests: toNumber(formData.get("guests")),
      status: normEnum(formData.get("status")),

      direction: rawDirection ? JSON.parse(rawDirection as string) : undefined,

      livingrooms: toNumber(
        formData.get("livingrooms") ?? formData.get("livingRooms"),
      ),
      bathrooms: toNumber(formData.get("bathrooms")),
      bedrooms: toNumber(formData.get("bedrooms")),
      kitchens: toNumber(formData.get("kitchens")),
      area: toNumber(formData.get("area") ?? formData.get("space")),
      floor: toNumber(formData.get("floor")),

      petAllowed: toBool(formData.get("petAllowed") ?? formData.get("pets")),
      furnished: toBool(formData.get("furnished") ?? formData.get("furniture")),
      elvator: toBool(formData.get("elvator") ?? formData.get("elevator")),

      sellOrRent,
      rentType:
        sellOrRent === "RENT"
          ? normEnum(formData.get("rentType"))
          : sellOrRent === "SELL"
            ? null
            : undefined,

      categoryId: formData.get("categoryId") ?? undefined,

      // 📍 الموقع (اختياري)
      location: {
        latitude: toNumber(formData.get("latitude")),
        longitude: toNumber(formData.get("longitude")),
        address: formData.get("address")?.toString(),
        city: formData.get("city")?.toString(),
        state: formData.get("state")?.toString(),
        country: formData.get("country")?.toString(),
      },
    };

    const manualRentalPeriods = parseManualRentalPeriods(
      formData.get("manualRentalPeriods"),
    );

    // 🧪 Validation
    const parsed = updatePropertySchema.safeParse(rawData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw Errors.VALIDATION(issue.message, issue.path.join("."));
    }

    const { location, ...propertyData } = parsed.data;

    const { updatedProperty, manualRentalEndsAt } = await prisma.$transaction(
      async (tx) => {
        const nextStatus = "PENDING_REVIEW" as Availability;
        const nextSellOrRent = (propertyData.sellOrRent ??
          property.sellOrRent) as TransactionType;
        const nextRentType = (
          propertyData.rentType !== undefined
            ? propertyData.rentType
            : property.rentType
        ) as RentType | null;

        // 🏠 تحديث العقار
        const updated = await tx.property.update({
          where: { id },
          data: {
            ...propertyData,
            ...pendingReviewData,
          },
        });

        // 📍 تحديث الموقع (إن وُجد)
        if (location && Object.values(location).some((v) => v !== undefined)) {
          await tx.location.update({
            where: { propertyId: id },
            data: location,
          });
        }

        const manualRentalState = await syncManualRentalStatus({
          tx,
          itemId: id,
          itemType: "PROPERTY",
          ownerId: owner.id,
          nextStatus,
          nextSellOrRent,
          nextRentType,
          manualRentalPeriods,
        });

        return {
          updatedProperty: updated,
          manualRentalEndsAt: manualRentalState.manualRentalEndsAt,
        };
      },
    );

    await notifyAdminsOfModerationQueue("PROPERTY", id, "UPDATED");

    return NextResponse.json(
      {
        success: true,
        property: updatedProperty,
        listingState: {
          status: updatedProperty.status,
          sellOrRent: updatedProperty.sellOrRent,
          rentType: updatedProperty.rentType,
          manualRentalEndsAt: manualRentalEndsAt?.toISOString() ?? null,
        },
        message: "تم تحديث العقار وإرساله مجددًا لمراجعة الأدمن",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("UPDATE PROPERTY ERROR:", error);
    return handleApiError(error, req);
  }
}
