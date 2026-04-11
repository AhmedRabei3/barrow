import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { handleApiError } from "../lib/errors/errorHandler";
import { Errors } from "../lib/errors/errors";
import { createPurchaseRequestSchema } from "@/app/validations/purchaseValidations";
import { translateZodError } from "@/app/api/lib/errors/zodTranslator";
import { auth } from "@/auth";
import {
  resolveIsArabicFromRequest,
  localizeErrorMessage,
} from "@/app/i18n/errorMessages";

type PurchasableItem = {
  ownerId: string;
  owner: {
    id: string;
    name: string | null;
  };
  title?: string | null;
  name?: string | null;
  brand?: string | null;
  model?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const isArabic = resolveIsArabicFromRequest(req);
    const session = await auth();
    const user = session?.user ?? null;

    /* 1. قراءة والتحقق من البيانات */
    const body = await req.json();
    const result = createPurchaseRequestSchema.safeParse(body);
    if (!result.success) {
      const { message, field } = translateZodError(result.error);
      throw Errors.VALIDATION(message, field);
    }

    const { itemId, itemType, fullName, requestKind, phoneNumber, note } =
      result.data;

    /* 2. جلب العنصر */
    let item: PurchasableItem | null = null;
    switch (itemType) {
      case "NEW_CAR":
        item = await prisma.newCar.findUnique({
          where: { id: itemId },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
        break;
      case "USED_CAR":
        item = await prisma.oldCar.findUnique({
          where: { id: itemId },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
        break;
      case "PROPERTY":
        item = await prisma.property.findUnique({
          where: { id: itemId },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
        break;
      case "OTHER":
        item = await prisma.otherItem.findUnique({
          where: { id: itemId },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
        break;
    }

    if (!item) throw Errors.NOT_FOUND("العنصر غير موجود");

    /* 3. منع التواصل مع النفس */
    if (user?.id && item.ownerId === user.id) {
      throw Errors.VALIDATION("لا يمكنك التواصل مع نفسك");
    }

    const requesterName = user?.name?.trim() || fullName;
    const requestTypeLabel =
      requestKind === "RENT"
        ? isArabic
          ? "طلب إيجار"
          : "Rental request"
        : isArabic
          ? "طلب شراء"
          : "Purchase request";
    const itemLabel =
      item.title ||
      item.name ||
      [item.brand, item.model].filter(Boolean).join(" ") ||
      (isArabic ? "عنصر" : "Listing");

    /* 4. إشعار المالك */
    await prisma.notification.create({
      data: {
        userId: item.ownerId,
        title: isArabic
          ? `عميل جديد - ${requestTypeLabel}`
          : `New lead - ${requestTypeLabel}`,
        message: isArabic
          ? `الاسم: ${requesterName}\nنوع الطلب: ${requestTypeLabel}\nالعنصر: ${itemLabel}\nرقم الهاتف: ${phoneNumber}${note ? `\nملاحظة:\n${note}` : ""}`
          : `Name: ${requesterName}\nRequest type: ${requestTypeLabel}\nItem: ${itemLabel}\nPhone number: ${phoneNumber}${note ? `\nNote:\n${note}` : ""}`,
        type: NotificationType.PURCHASEREQUEST,
      },
    });

    /* 5. إشعار المرسل */
    if (user?.id) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: isArabic ? "تم إرسال طلبك" : "Your request was sent",
          message: isArabic
            ? "تم إرسال معلومات التواصل إلى مالك العنصر."
            : "Your contact details were sent to the item owner.",
          type: NotificationType.INFO,
        },
      });
    }

    /* 7. الرد */
    return NextResponse.json(
      {
        message: localizeErrorMessage(
          isArabic
            ? "تم إرسال بيانات التواصل بنجاح"
            : "Contact details sent successfully",
          isArabic,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, req);
  }
}
