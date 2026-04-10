//src/lib/uploads
// رفع صورة إلى مجلد محدد في Cloudinary من الواجهة (يستخدم unsigned preset)
export async function uploadToCloudinary(file: File, folder: string = "cars") {
  const url = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "upload_preset",
    String(process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET),
  ); // unsigned preset
  formData.append("folder", folder);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error("Cloudinary upload failed: " + txt);
  }

  const data = await res.json();
  // data.secure_url contains final https url
  return data; // full cloudinary response
}
