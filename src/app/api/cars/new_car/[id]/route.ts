import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/app/api/utils/authHelper";
import { Errors } from "@/app/api/lib/errors/errors";
import { normEnum, toNumber, images } from "@/app/api/utils/utils";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { updateNewCarSchema } from "@/app/validations/newCarValidations";

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

    // 🔎 التأكد من الملكية
    const car = await prisma.newCar.findFirst({
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

    const rawData = {
      brand: formData.get("brand"),
      model: formData.get("model"),
      year: toNumber(formData.get("year")),
      color: formData.get("color"),
      price: toNumber(formData.get("price")),
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

      status: formData.get("status")
        ? normEnum(formData.get("status"))
        : undefined,

      location: {
        latitude: toNumber(formData.get("latitude")),
        longitude: toNumber(formData.get("longitude")),
        address: formData.get("address"),
        city: formData.get("city"),
        state: formData.get("state"),
        country: formData.get("country"),
      },
    };

    // 🧪 Validation
    const parsed = updateNewCarSchema.safeParse(rawData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw Errors.VALIDATION(issue.message, issue.path.join("."));
    }

    const { location, ...carData } = parsed.data;

    // معالجة الصور إذا تم تقديمها
    let uploadedImages: Array<{
      secure_url: string;
      public_id?: string;
    }> | null = null;
    const imagesFormData = formData.getAll("images");
    if (imagesFormData && imagesFormData.length > 0) {
      uploadedImages = await images({ formData });
    }

    const updatedCar = await prisma.$transaction(async (tx) => {
      const updated = await tx.newCar.update({
        where: { id },
        data: carData,
      });

      // تحديث الصور إذا تم تقديمها
      if (uploadedImages && uploadedImages.length > 0) {
        // حذف الصور القديمة
        await tx.itemImage.deleteMany({
          where: {
            itemId: id,
            itemType: "NEW_CAR",
          },
        });

        // إضافة الصور الجديدة
        await tx.itemImage.createMany({
          data: uploadedImages.map((img) => ({
            itemId: id,
            itemType: "NEW_CAR",
            url: img.secure_url,
            publicId: img.public_id ?? "",
          })),
        });
      }

      if (location && Object.values(location).some((v) => v !== undefined)) {
        await tx.location.update({
          where: { newCarId: id },
          data: {
            ...(location.latitude !== undefined && {
              latitude: Number(location.latitude),
            }),
            ...(location.longitude !== undefined && {
              longitude: Number(location.longitude),
            }),
            ...(location.address !== undefined && {
              address: location.address,
            }),
            ...(location.city !== undefined && {
              city: location.city,
            }),
            ...(location.state !== undefined && {
              state: location.state,
            }),
            ...(location.country !== undefined && {
              country: location.country,
            }),
          },
        });
      }

      return updated;
    });

    return NextResponse.json(
      { success: true, car: updatedCar, message: "تم تحديث السيارة بنجاح" },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Update New Car Error:", error);
    return handleApiError(error, req);
  }
}
