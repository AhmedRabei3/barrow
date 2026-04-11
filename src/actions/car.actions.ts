"use server";

import {
  CreateNewCarInput,
  createNewCarSchema,
} from "@/app/validations/newCarValidations";
import { translateZodError } from "../app/api/lib/errors/zodTranslator";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { pendingReviewData } from "@/app/api/utils/moderation";

type FormState = {
  success?: boolean;
  message?: string;
  carId?: string;
};

export async function addNewCarAction(
  data: CreateNewCarInput,
): Promise<FormState> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "يجب تسجيل الدخول" };
    }

    const validation = createNewCarSchema.safeParse(data);
    if (!validation.success) {
      const { message } = translateZodError(validation.error);
      return { success: false, message };
    }
    const result = await prisma.newCar.create({
      data: {
        ...validation.data,
        ...pendingReviewData,
        ownerId: session.user.id,
      },
    });
    const carId = result.id;
    return {
      success: true,
      message: "Car submitted for review successfully",
      carId,
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const { message } = translateZodError(err);
      return { success: false, message };
    }
    return { success: false, message: "حدث خطأ غير متوقع" };
  }
}

export async function getCarCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: { type: "NEW_CAR" },
      select: { id: true, name: true, icon: true },
    });
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}
