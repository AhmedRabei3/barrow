import cloudinary from "@/lib/cloudinary";

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
};

export async function uploadToCloudinary(
  file: File,
  folder: string = "cars",
): Promise<CloudinaryUploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (error, result) => {
        if (error) return reject(error);
        resolve({
          secure_url: result?.secure_url || "",
          public_id: result?.public_id || "",
        });
      })
      .end(buffer);
  });
}

export async function deleteFromCloudinary(images: CloudinaryUploadResult[]) {
  for (const img of images) {
    try {
      await cloudinary.uploader.destroy(img.public_id);
    } catch (e) {
      console.error("❌ Failed to delete image from Cloudinary:", e);
      throw new Error("فشل حذف الصورة من Cloudinary");
    }
  }
}
