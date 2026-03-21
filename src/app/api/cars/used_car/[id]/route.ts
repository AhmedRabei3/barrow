import { NextRequest, NextResponse } from "next/server";
import { updateUsedCarSchema } from "@/app/validations/usedCarValidations";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/app/api/utils/authHelper";
import { Errors } from "@/app/api/lib/errors/errors";
import { normEnum } from "@/app/api/utils/utils";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";

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
      brand: formData.get("brand"),
      model: formData.get("model"),
      year: formData.get("year"),
      color: formData.get("color"),
      mileage: formData.get("mileage"),
      price: formData.get("price"),
      description: formData.get("description"),

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

      reAssembled: formData.get("reAssembled"),
      repainted: formData.get("repainted"),

      status: formData.get("status")
        ? normEnum(formData.get("status"))
        : undefined,

      // 📍 الموقع اختياري
      location: {
        latitude: formData.get("latitude"),
        longitude: formData.get("longitude"),
        city: formData.get("city"),
        address: formData.get("address"),
        state: formData.get("state"),
        country: formData.get("country"),
      },
    };

    // 🧪 Validation
    const parsed = updateUsedCarSchema.safeParse(data);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw Errors.VALIDATION(issue.message, issue.path.join("."));
    }

    // 🧾 فصل location عن بيانات السيارة
    const { location, ...carData } = parsed.data;

    const updatedCar = await prisma.$transaction(async (tx) => {
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

      return updated;
    });

    return NextResponse.json(
      { success: true, car: updatedCar },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Update Used Car Error:", error);
    return handleApiError(error, req);
  }
}
