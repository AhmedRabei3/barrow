"use server";

import { prisma } from "@/lib/prisma";
import { createCategorySchema } from "@/app/validations/categoryValidations";
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
      name: formData.get("name"),
      icon: formData.get("icon") || undefined,
      type: formData.get("type"),
    });

    // 🟢 Check uniqueness (case-insensitive)
    const oldCat = await prisma.category.findFirst({
      where: {
        name: { equals: parsed.name, mode: "insensitive" },
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
      data: parsed,
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
