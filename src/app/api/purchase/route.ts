import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { authHelper } from "../utils/authHelper";
import { handleApiError } from "../lib/errors/errorHandler";
import { Errors } from "../lib/errors/errors";
import { createPurchaseRequestSchema } from "@/app/validations/purchaseValidations";
import { translateZodError } from "@/app/api/lib/errors/zodTranslator";

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
    const user = await authHelper();

    /* 1. قراءة والتحقق من البيانات */
    const body = await req.json();
    const result = createPurchaseRequestSchema.safeParse(body);
    if (!result.success) {
      const { message, field } = translateZodError(result.error);
      throw Errors.VALIDATION(message, field);
    }

    const { itemId, itemType, phoneNumber, note } = result.data;

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
    if (item.ownerId === user.id) {
      throw Errors.VALIDATION("لا يمكنك التواصل مع نفسك");
    }

    /* 4. إشعار المالك */
    await prisma.notification.create({
      data: {
        userId: item.ownerId,
        title: `زبون جديد`,
        message: `
         إن السيد ${user.name} مهتم بـ:
         ${(item.title || item.name || item.brand, " ", item.model || "عنصر")}

         رقم الهاتف للتواصل:
         ${phoneNumber}

         ${note ? `ملاحظة:\n${note}` : ""}
        `,
        type: NotificationType.PURCHASEREQUEST,
      },
    });

    /* 5. إشعار المرسل */
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "تم إرسال طلبك ",
        message: "تم إرسال رقم هاتفك لمالك العنصر.",
        type: NotificationType.INFO,
      },
    });

    /* 7. الرد */
    return NextResponse.json(
      {
        message: "تم إرسال بيانات التواصل بنجاح",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, req);
  }
}
