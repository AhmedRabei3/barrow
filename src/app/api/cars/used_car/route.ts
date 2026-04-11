import { NextRequest, NextResponse } from "next/server";
import { createUsedCarSchema } from "@/app/validations/usedCarValidations";
import { createItemWithLocation } from "../../utils/createHelper";
import { requireActiveUser } from "../../utils/authHelper";
import {
  images,
  locCheck,
  normEnum,
  toBool,
  toNumber,
} from "../../utils/utils";
import { handleApiError } from "../../lib/errors/errorHandler";
import { Errors } from "../../lib/errors/errors";
import {
  notifyAdminsOfModerationQueue,
  pendingReviewData,
} from "../../utils/moderation";

/**
 * @description API route to create a new used car
 * @route POST /api/cars/used_car
 * @access Private (requires authentication)
 */

export async function POST(req: NextRequest) {
  const owner = await requireActiveUser();

  try {
    const formData = await req.formData();

    const sellOrRent = normEnum(formData.get("sellOrRent"));

    const data = {
      brand: formData.get("brand"),
      model: formData.get("model"),
      year: toNumber(formData.get("year")),
      color: formData.get("color"),
      mileage: toNumber(formData.get("mileage")),
      price: toNumber(formData.get("price")),
      description: formData.get("description"),

      sellOrRent: formData.get("sellOrRent"),
      rentType:
        sellOrRent === "RENT" ? normEnum(formData.get("rentType")) : null,

      fuelType: normEnum(formData.get("fuelType")),
      gearType: normEnum(formData.get("gearType")),
      categoryId: formData.get("categoryId"),

      reAssembled: toBool(formData.get("reAssembled")),
      repainted: toBool(formData.get("repainted")),
    };

    console.log("📋 Form Data:", data);
    // parsing
    const parsed = createUsedCarSchema.safeParse(data);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw Errors.VALIDATION(issue.message, issue.path.join("."));
    }

    const location = locCheck({ formData });
    const uploadedImages = await images({ formData });

    const car = await createItemWithLocation({
      location,
      images: uploadedImages,
      itemType: "USED_CAR",
      createItem: (tx) => {
        const { categoryId, ...carData } = parsed.data;

        return tx.oldCar.create({
          data: {
            ...carData,
            sellOrRent: carData.sellOrRent ?? "RENT",
            fuelType: carData.fuelType ?? "GASOLINE",
            gearType: carData.gearType ?? "AUTOMATIC",
            ...pendingReviewData,
            rentType: carData.rentType ?? null,
            color: carData.color ?? "",
            mileage: carData.mileage ?? 0,
            owner: { connect: { id: owner.id } },
            category: { connect: { id: categoryId } },
          },
        });
      },
    });
    await notifyAdminsOfModerationQueue("USED_CAR", car.id, "CREATED", true);

    return NextResponse.json(
      {
        success: true,
        car,
        message: "تم إرسال السيارة للمراجعة وسيتم نشرها بعد موافقة الأدمن",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Create Used Car Error:", error);
    return handleApiError(error, req);
  }
}
