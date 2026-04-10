import { NextRequest, NextResponse } from "next/server";
import { updateUsedCarSchema } from "@/app/validations/usedCarValidations";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/app/api/utils/authHelper";
import { Errors } from "@/app/api/lib/errors/errors";
import { normEnum, normString, toBool, toNumber } from "@/app/api/utils/utils";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import {
  parseManualRentalPeriods,
  syncManualRentalStatus,
} from "@/app/api/utils/manualRentalStatus";
import { Availability, TransactionType, type RentType } from "@prisma/client";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const owner = await requireActiveUser();

  try {
    const { id } = await params;
    if (!id) {
      throw Errors.VALIDATION("معرّف السيارة مطلوب");
    }

    // 🔎 التأكد أن السيارة موجودة وتخص المستخدم
    const car = await prisma.oldCar.findFirst({
      where: {
        id,
        ownerId: owner.id,
        isDeleted: false,
      },
    });

    if (!car) {
      throw Errors.NOT_FOUND();
    }

    const formData = await req.formData();

    const sellOrRent = formData.get("sellOrRent")
      ? normEnum(formData.get("sellOrRent"))
      : undefined;

    const data = {
      brand: normString(formData.get("brand")),
      model: normString(formData.get("model")),
      year: toNumber(formData.get("year")),
      color: normString(formData.get("color")),
      mileage: toNumber(formData.get("mileage")),
      price: toNumber(formData.get("price")),
      description: normString(formData.get("description")),

      sellOrRent,

      rentType:
        sellOrRent === "RENT"
          ? normEnum(formData.get("rentType"))
          : sellOrRent === "SELL"
            ? null
            : undefined,

      fuelType: formData.get("fuelType")
        ? normEnum(formData.get("fuelType"))
        : undefined,

      gearType: formData.get("gearType")
        ? normEnum(formData.get("gearType"))
        : undefined,

      reAssembled: toBool(formData.get("reAssembled")),
      repainted: toBool(formData.get("repainted")),

      status: formData.get("status")
        ? normEnum(formData.get("status"))
        : undefined,

      // 📍 الموقع اختياري
      location: {
        latitude: toNumber(formData.get("latitude")),
        longitude: toNumber(formData.get("longitude")),
        city: normString(formData.get("city")),
        address: normString(formData.get("address")),
        state: normString(formData.get("state")),
        country: normString(formData.get("country")),
      },
    };

    const manualRentalPeriods = parseManualRentalPeriods(
      formData.get("manualRentalPeriods"),
    );

    // 🧪 Validation
    const parsed = updateUsedCarSchema.safeParse(data);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw Errors.VALIDATION(issue.message, issue.path.join("."));
    }

    // 🧾 فصل location عن بيانات السيارة
    const { location, ...carData } = parsed.data;

    const { updatedCar, manualRentalEndsAt } = await prisma.$transaction(
      async (tx) => {
        const nextStatus = (carData.status ?? car.status) as Availability;
        const nextSellOrRent = (carData.sellOrRent ??
          car.sellOrRent) as TransactionType;
        const nextRentType = (
          carData.rentType !== undefined ? carData.rentType : car.rentType
        ) as RentType | null;

        const updated = await tx.oldCar.update({
          where: { id },
          data: carData,
        });

        if (location) {
          await tx.location.update({
            where: { oldCarId: id },
            data: {
              latitude: location.latitude,
              longitude: location.longitude,
              state: location.state,
              city: location.city,
              country: location.country,
              address: location.address,
            },
          });
        }

        const manualRentalState = await syncManualRentalStatus({
          tx,
          itemId: id,
          itemType: "USED_CAR",
          ownerId: owner.id,
          nextStatus,
          nextSellOrRent,
          nextRentType,
          manualRentalPeriods,
        });

        return {
          updatedCar: updated,
          manualRentalEndsAt: manualRentalState.manualRentalEndsAt,
        };
      },
    );

    return NextResponse.json(
      {
        success: true,
        car: updatedCar,
        listingState: {
          status: updatedCar.status,
          sellOrRent: updatedCar.sellOrRent,
          rentType: updatedCar.rentType,
          manualRentalEndsAt: manualRentalEndsAt?.toISOString() ?? null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Update Used Car Error:", error);
    return handleApiError(error, req);
  }
}
