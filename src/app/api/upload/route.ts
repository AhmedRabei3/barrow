import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ItemType } from "@prisma/client";



const isItemType = (value: string): value is ItemType =>
  Object.values(ItemType).includes(value as ItemType);

import { uploadToCloudinary } from "@/app/api/utils/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const itemId = formData.get("itemId") as string;
    const itemType = formData.get("itemType") as string;
    const files = formData.getAll("images") as File[];

    if (!itemId || !itemType) {
      return NextResponse.json(
        { success: false, message: "معرّف العنصر ونوعه مطلوبان" },
        { status: 400 },
      );
    }

    if (!isItemType(itemType)) {
      return NextResponse.json(
        { success: false, message: "نوع عنصر غير صالح" },
        { status: 400 },
      );
    }

    if (!files.length) {
      return NextResponse.json(
        { success: false, message: "لا توجد ملفات للرفع" },
        { status: 400 },
      );
    }

    const uploadedImages = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { success: false, message: `نوع ملف غير مدعوم: ${file.type}` },
          { status: 400 },
        );
      }

      const uploadResult = await uploadToCloudinary(file);
      if (!uploadResult.secure_url) {
        return NextResponse.json(
          { success: false, message: "فشل رفع الصورة" },
          { status: 500 },
        );
      }

      const savedImage = await prisma.itemImage.create({
        data: {
          itemId,
          itemType,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id ?? "",
        },
      });

      uploadedImages.push(savedImage);
    }

    return NextResponse.json({
      success: true,
      message: "تم رفع الصور بنجاح",
      images: uploadedImages,
    });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء رفع الملفات" },
      { status: 500 },
    );
  }
}
