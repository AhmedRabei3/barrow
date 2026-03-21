import { CloudinaryUploadResult } from "@/app/api/utils/cloudinary";
import { uploadToCloudinary } from "@/lib/upload";
import { NextResponse } from "next/server";

/* -------- 6. HANDLE IMAGES -------- */
export const imageService = async (formData: FormData) => {
  const files = formData.getAll("images") as File[];
  if (!files.length) {
    return NextResponse.json(
      { success: false, message: "الرجاء رفع صورة واحدة على الأقل" },
      { status: 400 },
    );
  }

  const uploadedImages = await Promise.all(
    files.map(async (file) => {
      const raw = await uploadToCloudinary(file);
      const normalized: CloudinaryUploadResult = {
        secure_url: raw.secure_url ?? "",
        public_id: raw.public_id ?? "",
      };
      if (!normalized.secure_url || !normalized.public_id) {
        throw new Error("خطأ في رفع الصورة إلى السحابة");
      }
      return normalized;
    }),
  );

  return uploadedImages;
};
