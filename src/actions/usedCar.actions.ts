"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { pendingReviewData } from "@/app/api/utils/moderation";

export async function addNewCarAction(data: {
  brand: string;
  model: string;
  year: number;
  color: string;
  price: number;
  categoryId: string;
  descriptions: string;
  sellOrRent: "SELL" | "RENT";
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    await prisma.newCar.create({
      data: {
        brand: data.brand,
        model: data.model,
        year: data.year,
        color: data.color,
        price: data.price,
        ownerId: session.user.id,
        categoryId: data.categoryId,
        description: data.descriptions,
        sellOrRent: data.sellOrRent,
        fuelType: "GASOLINE",
        gearType: "AUTOMATIC",
        ...pendingReviewData,
      },
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { success: false, message };
  }
}
