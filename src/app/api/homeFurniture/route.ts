import { NextRequest, NextResponse } from "next/server";
import { images, locCheck, normEnum, toNumber } from "../utils/utils";
import { createHomeFurnitureSchema } from "@/app/validations";
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
      brand: formData.get("brand") ?? undefined,
      description: formData.get("description") ?? undefined,
      price: toNumber(formData.get("price")),
      ownerId: owner.id,
      categoryId: formData.get("categoryId"),
      furnitureType: formData.get("furnitureType") ?? undefined,
      condition: formData.get("condition") ?? undefined,
      material: formData.get("material") ?? undefined,
      roomType: formData.get("roomType") ?? undefined,
      dimensions: formData.get("dimensions") ?? undefined,
      color: formData.get("color") ?? undefined,
      assemblyIncluded: toOptionalBoolean(formData.get("assemblyIncluded")),
      isUsed: toOptionalBoolean(formData.get("isUsed")),
      sellOrRent: formData.get("sellOrRent") || "SELL",
      rentType:
        formData.get("sellOrRent") === "RENT"
          ? normEnum(formData.get("rentType"))
          : null,
    };

    const parsedData = createHomeFurnitureSchema.safeParse(rawData);
    if (!parsedData.success) {
      const issue = parsedData.error.issues[0];
      throw Errors.VALIDATION(issue.message, issue.path.join("."));
    }

    const parsedLocData = locCheck({ formData });
    const uploadedImages = await images({ formData });

    const item = await createItemWithLocation({
      location: parsedLocData,
      images: uploadedImages,
      itemType: "HOME_FURNITURE",
      createItem: (tx) =>
        tx.homeFurniture.create({
          data: {
            ...parsedData.data,
            ...pendingReviewData,
            ownerId: owner.id,
          },
        }),
    });

    await notifyAdminsOfModerationQueue(
      "HOME_FURNITURE",
      item.id,
      "CREATED",
      isArabic,
    );

    return NextResponse.json(
      {
        message: t(
          "تم إرسال الأثاث للمراجعة وسيتم نشره بعد موافقة المدير",
          "The furniture listing was submitted for review and will be published after admin approval",
        ),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("CREATE HOME FURNITURE ERROR:", err);
    return handleApiError(err, req);
  }
}
