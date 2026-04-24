import { NextRequest, NextResponse } from "next/server";
import { images, locCheck, normEnum, toNumber } from "../utils/utils";
import { createMedicalDeviceSchema } from "@/app/validations";
import { requireActiveUser } from "../utils/authHelper";
import { Errors } from "../lib/errors/errors";
import { handleApiError } from "../lib/errors/errorHandler";
import { createItemWithLocation } from "../utils/createHelper";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";
import {
  notifyAdminsOfModerationQueue,
  pendingReviewData,
} from "../utils/moderation";

const toOptionalBoolean = (value: FormDataEntryValue | null) => {
  if (value === null || value === "") return undefined;
  return String(value) === "true";
};

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const owner = await requireActiveUser();
    const formData = await req.formData();
    const rawData = {
      name: formData.get("name"),
      manufacturer: formData.get("manufacturer") ?? undefined,
      model: formData.get("model") ?? undefined,
      description: formData.get("description") ?? undefined,
      price: toNumber(formData.get("price")),
      ownerId: owner.id,
      categoryId: formData.get("categoryId"),
      deviceClass: formData.get("deviceClass") ?? undefined,
      condition: formData.get("condition") ?? undefined,
      manufacturerCountry: formData.get("manufacturerCountry") ?? undefined,
      isUsed: toOptionalBoolean(formData.get("isUsed")),
      warrantyMonths: toNumber(formData.get("warrantyMonths")),
      usageHours: toNumber(formData.get("usageHours")),
      requiresPrescription: toOptionalBoolean(
        formData.get("requiresPrescription"),
      ),
      maintenanceRecordAvailable: toOptionalBoolean(
        formData.get("maintenanceRecordAvailable"),
      ),
      sellOrRent: formData.get("sellOrRent") || "SELL",
      rentType:
        formData.get("sellOrRent") === "RENT"
          ? normEnum(formData.get("rentType"))
          : null,
    };

    const parsedData = createMedicalDeviceSchema.safeParse(rawData);
    if (!parsedData.success) {
      const issue = parsedData.error.issues[0];
      throw Errors.VALIDATION(issue.message, issue.path.join("."));
    }

    const parsedLocData = locCheck({ formData });
    const uploadedImages = await images({ formData });

    const item = await createItemWithLocation({
      location: parsedLocData,
      images: uploadedImages,
      itemType: "MEDICAL_DEVICE",
      createItem: (tx) =>
        tx.medicalDevice.create({
          data: {
            ...parsedData.data,
            ...pendingReviewData,
            ownerId: owner.id,
          },
        }),
    });

    await notifyAdminsOfModerationQueue(
      "MEDICAL_DEVICE",
      item.id,
      "CREATED",
      isArabic,
    );

    return NextResponse.json(
      {
        message: t(
          "تم إرسال الجهاز الطبي للمراجعة وسيتم نشره بعد موافقة المدير",
          "The medical device was submitted for review and will be published after admin approval",
        ),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("CREATE MEDICAL DEVICE ERROR:", err);
    return handleApiError(err, req);
  }
}
