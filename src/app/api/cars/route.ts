import { NextRequest, NextResponse } from "next/server";
import { createNewCarSchema } from "@/app/validations/newCarValidations";
import { createItemWithLocation } from "../utils/createHelper";
import { requireActiveUser } from "../utils/authHelper";
import { handleApiError } from "../lib/errors/errorHandler";
import {
  images,
  locCheck,
  normEnum,
  normString,
  toNumber,
} from "../utils/utils";
import { Errors } from "../lib/errors/errors";
import { translateZodError } from "../lib/errors/zodTranslator";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import {
  notifyAdminsOfModerationQueue,
  pendingReviewData,
} from "../utils/moderation";

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const owner = await requireActiveUser();
    const formData = await req.formData();
    const rawData = {
      brand: normString(formData.get("brand")),
      model: normString(formData.get("model")),
      year: toNumber(formData.get("year")),
      color: formData.get("color"),
      price: toNumber(formData.get("price")),
      description: formData.get("description"),
      sellOrRent: normEnum(formData.get("sellOrRent")),
      rentType:
        formData.get("sellOrRent") === "RENT"
          ? normEnum(formData.get("rentType"))
          : null,
      fuelType: normEnum(formData.get("fuelType")),
      gearType: normEnum(formData.get("gearType")),
      categoryId: formData.get("categoryId"),
    };

    // ✅ Validation
    const parsed = createNewCarSchema.safeParse(rawData);
    if (!parsed.success) {
      const { message, field } = translateZodError(parsed.error);
      throw Errors.VALIDATION(message, field);
    }
    const locParsed = locCheck({ formData });
    // ✅ الصور
    const uploadedImages = await images({ formData });

    // 🔥 Transaction واحدة

    const item = await createItemWithLocation({
      location: locParsed,
      images: uploadedImages,
      itemType: "NEW_CAR",
      createItem: (tx) =>
        tx.newCar.create({
          data: {
            ...parsed.data,
            ...pendingReviewData,
            ownerId: owner.id,
          },
        }),
    });
    await notifyAdminsOfModerationQueue(
      "NEW_CAR",
      item.id,
      "CREATED",
      isArabic,
    );
    return NextResponse.json(
      {
        success: true,
        message: t(
          "تم إرسال السيارة للمراجعة وسيتم نشرها بعد موافقة المدير",
          "The car was submitted for review and will be published after admin approval",
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Error creating new car:", error);
    return handleApiError(error, req);
  }
}
