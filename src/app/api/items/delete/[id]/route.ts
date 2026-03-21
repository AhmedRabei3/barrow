import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeUser } from "@/app/api/utils/authHelper";
import {
  findItemByType,
  getItemTypeById,
  softDeleteByType,
} from "../../functions/helpers";
import { Errors } from "@/app/api/lib/errors/errors";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { deleteFromCloudinary } from "@/app/api/utils/cloudinary";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: itemId } = await params;

  try {
    const user = await activeUser();
    if (!user) throw Errors.UNAUTHORIZED();

    const { itemType } = await getItemTypeById(itemId);

    const item = await findItemByType(itemType, itemId);
    if (!item || item?.isDeleted)
      throw Errors.NOT_FOUND("العنصر غير موجود أو محذوف");

    // صلاحيات
    if (!user.isAdmin && item.ownerId !== user.id) {
      throw Errors.FORBIDDEN("ممنوع");
    }

    // جلب الصور قبل الحذف
    const images = await prisma.itemImage.findMany({
      where: { itemId },
      select: { publicId: true },
    });

    await prisma.$transaction(async (tx) => {
      // حذف العلاقات أولاً
      await tx.itemImage.deleteMany({ where: { itemId } });
      await tx.review.deleteMany({ where: { itemId } });
      await tx.location.deleteMany({
        where: {
          OR: [
            { newCarId: itemId },
            { oldCarId: itemId },
            { propertyId: itemId },
            { otherItemId: itemId },
          ],
        },
      });
      // Soft delete للعنصر
      await softDeleteByType(tx, itemType, itemId);
    });

    // حذف الصور من Cloudinary خارج transaction
    if (images.length) {
      try {
        await deleteFromCloudinary(
          images.map((i) => ({
            public_id: i.publicId,
            secure_url: "",
          })),
        );
      } catch (cloudErr) {
        console.error("Cloudinary delete failed", cloudErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم الحذف بنجاح",
    });
  } catch (error) {
    console.error("DELETE ITEM ERROR", { itemId, error });
    return handleApiError(error, req);
  }
}
