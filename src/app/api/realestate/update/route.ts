import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updatePropertySchema } from "@/app/validations/propertyValidations";
import { Availability, Prisma } from "@prisma/client";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

/**
 * @descriptions Update property
 * @method PUT
 * @route ~/api/realestate/update
 */
export async function PUT(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      {
        success: false,
        message: localizeErrorMessage("Please login", isArabic),
      },
      { status: 401 },
    );
  }
  const ownerId = session.user.id;

  try {
    const body = await req.json();

    const parsed = updatePropertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.format() },
        { status: 400 },
      );
    }

    const { id, location: _location, ...updateData } = parsed.data;
    void _location;

    // Ensure property exists and belongs to user
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property || property.ownerId !== ownerId) {
      return NextResponse.json(
        {
          success: false,
          message: localizeErrorMessage(
            "Property not found or unauthorized",
            isArabic,
          ),
        },
        { status: 403 },
      );
    }

    // Update property
    const updated = await prisma.property.update({
      where: { id },
      data: {
        ...updateData,
        status: updateData.status as Availability | undefined,
      } as Prisma.PropertyUncheckedUpdateInput,
    });

    return NextResponse.json({
      success: true,
      message: t("تم تحديث العقار بنجاح", "Property updated successfully"),
      property: updated,
    });
  } catch (err) {
    console.error("update property error:", err);
    return NextResponse.json(
      { success: false, message: "حدث خطأ غير متوقع", error: String(err) },
      { status: 500 },
    );
  }
}
