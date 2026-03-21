import axios from "axios";
import toast from "react-hot-toast";

export const uploadImages = async (
  images: FileList | File[],
  itemId: string,
  itemType: string
): Promise<boolean> => {
  const imageArray = Array.isArray(images) ? images : Array.from(images);

  if (imageArray.length === 0) {
    toast.error("لا توجد صور لرفعها");
    return false;
  }

  try {
    const formData = new FormData();
    formData.append("itemId", itemId);
    formData.append("itemType", itemType);

    imageArray.forEach((file) => {
      formData.append("images", file); // backend يجب أن يدعم images[]
    });

    await axios.post("/api/items/upload-images", formData);

    toast.success("تم رفع الصور بنجاح");
    return true;
  } catch (error) {
    console.error("Upload failed", error);
    toast.error("فشل في رفع الصور");
    return false;
  }
};
