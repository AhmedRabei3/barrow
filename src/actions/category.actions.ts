"use server";

import { prisma } from "@/lib/prisma";
import {
  createCategorySchema,
  updateCategorySchema,
} from "@/app/validations/categoryValidations";
import { translateZodError } from "../app/api/lib/errors/zodTranslator";
import { z } from "zod";
import { auth } from "@/auth";
import { Category } from "@prisma/client";

type FormState = {
  success?: boolean;
  message?: string;
  category?: Category;
};

export async function addNewCategoryAction(
  formData: FormData,
): Promise<FormState> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "يجب تسجيل الدخول" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.isAdmin) {
      return { success: false, message: "غير مصرح" };
    }

    // 🟢 Parse and validate input
    const parsed = createCategorySchema.parse({
      nameAr: formData.get("nameAr"),
      nameEn: formData.get("nameEn"),
      icon: formData.get("icon") || undefined,
      type: formData.get("type"),
    });

    // 🟢 Check uniqueness (case-insensitive)
    const oldCat = await prisma.category.findFirst({
      where: {
        name: { equals: parsed.nameEn, mode: "insensitive" },
        type: { equals: parsed.type },
      },
    });

    if (oldCat) {
      return {
        success: false,
        message: "هذه الفئة موجودة بالفعل لهذا النوع.",
      };
    }

    // 🟢 Save in DB
    const newCategory = await prisma.category.create({
      data: {
        name: parsed.nameEn,
        nameEn: parsed.nameEn,
        nameAr: parsed.nameAr,
        icon: parsed.icon,
        type: parsed.type,
      },
    });

    return {
      success: true,
      message: "تمت إضافة الفئة بنجاح 🚀",
      category: newCategory,
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const { message } = translateZodError(err);
      return { success: false, message };
    }
    console.error(err);
    return { success: false, message: "حدث خطأ غير متوقع" };
  }
}

export async function updateCategoryAction(
  formData: FormData,
): Promise<FormState> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "يجب تسجيل الدخول" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.isAdmin) {
      return { success: false, message: "غير مصرح" };
    }

    const parsed = updateCategorySchema.parse({
      id: formData.get("id"),
      nameAr: formData.get("nameAr") || undefined,
      nameEn: formData.get("nameEn") || undefined,
      icon: formData.get("icon") || undefined,
      type: formData.get("type") || undefined,
    });

    const payload = {
      ...(parsed.nameAr ? { nameAr: parsed.nameAr } : {}),
      ...(parsed.nameEn ? { nameEn: parsed.nameEn, name: parsed.nameEn } : {}),
      ...(parsed.icon ? { icon: parsed.icon } : {}),
      ...(parsed.type ? { type: parsed.type } : {}),
    };

    if (!Object.keys(payload).length) {
      return { success: false, message: "لا توجد تغييرات للتحديث" };
    }

    const currentCategory = await prisma.category.findUnique({
      where: { id: parsed.id },
      select: { type: true, name: true },
    });

    if (!currentCategory) {
      return { success: false, message: "الفئة غير موجودة" };
    }

    const effectiveType = parsed.type ?? currentCategory.type;
    const effectiveName = payload.name ?? currentCategory.name;

    if (effectiveName) {
      const duplicate = await prisma.category.findFirst({
        where: {
          id: { not: parsed.id },
          name: { equals: effectiveName, mode: "insensitive" },
          type: effectiveType,
        },
      });
      if (duplicate) {
        return {
          success: false,
          message: "هذه الفئة موجودة بالفعل لهذا النوع.",
        };
      }
    }

    const updated = await prisma.category.update({
      where: { id: parsed.id },
      data: payload,
    });

    return {
      success: true,
      message: "تم تحديث الفئة بنجاح",
      category: updated,
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const { message } = translateZodError(err);
      return { success: false, message };
    }
    console.error(err);
    return { success: false, message: "حدث خطأ غير متوقع" };
  }
}
