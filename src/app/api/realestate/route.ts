import { NextResponse, NextRequest } from "next/server";
import { createPropertySchema } from "@/app/validations";
import { images, locCheck, normEnum, toBool, toNumber } from "../utils/utils";
import { requireActiveUser } from "../utils/authHelper";
import { createItemWithLocation } from "../utils/createHelper";
import { handleApiError } from "../lib/errors/errorHandler";
import { Errors } from "../lib/errors/errors";
import { translateZodError } from "../lib/errors/zodTranslator";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import {
  notifyAdminsOfModerationQueue,
  pendingReviewData,
} from "../utils/moderation";

/**------------------------------------------------------------------
 * @description Create a new realestate
 * @access private (Only loggedin user)
 * @route ~/api/realestate
 * @method POST 
 ------------------------------------------------------------------*/

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  /* -------- 1. AUTH -------- */
  const owner = await requireActiveUser();

  try {
    /* -------- 2. PARSE FORM DATA -------- */
    const formData = await req.formData();
    const direction = JSON.parse(formData.get("direction") as string);
    const rawData = {
      title: formData.get("title") ?? undefined,
      description: formData.get("description") ?? undefined,
      price: toNumber(formData.get("price")),
      guests: toNumber(formData.get("guests")),
      status: normEnum(formData.get("status")),
      direction,
      livingrooms: toNumber(formData.get("livingrooms")),
      bathrooms: toNumber(formData.get("bathrooms")),
      bedrooms: toNumber(formData.get("bedrooms")),
      kitchens: toNumber(formData.get("kitchens")),
      floor: toNumber(formData.get("floor")),
      area: toNumber(formData.get("area")),
      ownerId: owner.id,
      categoryId: formData.get("categoryId") ?? undefined,
      petAllowed: toBool(formData.get("petAllowed")),
      furnished: toBool(formData.get("furnished")),
      elvator: toBool(formData.get("elvator") ?? formData.get("elevator")),
      sellOrRent:
        formData.get("sellOrRent") !== "null"
          ? normEnum(formData.get("sellOrRent"))
          : "SELL",
      rentType:
        formData.get("rentType") &&
        formData.get("rentType") !== "null" &&
        formData.get("sellOrRent") !== "SELL"
          ? normEnum(formData.get("rentType"))
          : null,
    };
    console.log("rawData", rawData);
    /* -------- 3. VALIDATE PROPERTY -------- */
    const parsed = createPropertySchema.safeParse(rawData);
    if (!parsed.success) {
      const { message, field } = translateZodError(parsed.error);
      throw Errors.VALIDATION(
        message,
        field ?? parsed.error.issues[0].path.join("."),
      );
    }
    /* -------- 4. VALIDATE LOCATION -------- */
    const locParsed = locCheck({ formData });
    /* -------- 6. HANDLE IMAGES -------- */
    const uploadedImages = await images({ formData });
    /* -------- 7. SAVE TO DATABASE (TRANSACTION) -------- */
    const property = await createItemWithLocation({
      location: locParsed,
      images: uploadedImages,
      itemType: "PROPERTY",
      createItem: (tx) =>
        tx.property.create({
          data: {
            ...parsed.data,
            ...pendingReviewData,
            ownerId: owner.id,
          },
        }),
    });
    await notifyAdminsOfModerationQueue(
      "PROPERTY",
      property.id,
      "CREATED",
      isArabic,
    );
    return NextResponse.json({
      success: true,
      message: "تم إرسال العقار للمراجعة وسيتم نشره بعد موافقة الأدمن",
    });
  } catch (err) {
    console.error("CREATE PROPERTY ERROR:", err);
    return handleApiError(err, req);
  }
}
