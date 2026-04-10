import { NextRequest, NextResponse } from "next/server";
import { images, locCheck, normEnum, toNumber } from "../utils/utils";
import { createOtherItemSchema } from "@/app/validations";
import { requireActiveUser } from "../utils/authHelper";
import { Errors } from "../lib/errors/errors";
import { handleApiError } from "../lib/errors/errorHandler";
import { createItemWithLocation } from "../utils/createHelper";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    //-------------------Auth & permisseions ----------------
    const owner = await requireActiveUser();
    // ----------------- Extract Raw Data -----------------
    const formData = await req.formData();
    const rawData = {
      name: formData.get("name"),
      brand: formData.get("brand"),
      description: formData.get("description") ?? undefined,
      price: toNumber(formData.get("price")),
      ownerId: owner.id,
      categoryId: formData.get("categoryId"),
      sellOrRent: formData.get("sellOrRent") || "SELL",
      rentType:
        formData.get("sellOrRent") === "RENT"
          ? normEnum(formData.get("rentType"))
          : null,
    };
    // ----------------- Validate Main Item -----------------
    const parsedData = createOtherItemSchema.safeParse(rawData);
    if (!parsedData.success) {
      const issue = parsedData.error.issues[0];
      throw Errors.VALIDATION(issue.message, issue.path.join("."));
    }
    // ----------------- Validate Location -----------------
    const parsedLocData = locCheck({ formData });
    // ----------------- Image Handling -----------------
    const uploadedImages = await images({ formData });
    // ----------------- Database Insert -----------------
    await createItemWithLocation({
      location: parsedLocData,
      images: uploadedImages,
      itemType: "OTHER",
      createItem: (tx) =>
        tx.otherItem.create({
          data: {
            ...parsedData.data,
            status: "AVAILABLE",
            ownerId: owner.id,
          },
        }),
    });
    return NextResponse.json(
      {
        message: t(
          "تم نشر العنصر بنجاح",
          "Item published successfully",
        ),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("CREATE OTHER ITEM ERROR:", err);

    return handleApiError(err, req);
  }
}
