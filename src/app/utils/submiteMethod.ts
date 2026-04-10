"use client";

import toast from "react-hot-toast";
import { FieldValues, UseFormReset } from "react-hook-form";
import { Dispatch, SetStateAction } from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface submitPropsInterface {
  selectedImages: File[];
  data: FieldValues;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  url: string;
  onClose: () => void;
  reset: UseFormReset<FieldValues>;
  method?: "POST" | "PATCH";
  router: AppRouterInstance; // يمكنك تحديد نوع أكثر دقة إذا كنت تستخدم useRouter من next/navigation
}

const submitMethod = async ({
  selectedImages,
  data,
  setIsLoading,
  url,
  onClose,
  reset,
  method = "POST",
  router,
}: submitPropsInterface) => {
  try {
    // للإضافة: نتحقق من الصور والموقع
    if (method === "POST") {
      if (!selectedImages || selectedImages.length === 0) {
        toast.error("يرجى اختيار الصور أولاً");
        return;
      }

      if (!data.latitude || !data.longitude) {
        toast.error("يرجى اختيار الموقع على الخريطة");
        return;
      }
    } else if (method === "PATCH") {
      // للتعديل: لا نفرض الموقع والصور
      if (data.latitude && !data.longitude) {
        toast.error("يرجى اختيار الموقع على الخريطة بشكل صحيح");
        return;
      }
      if (!data.latitude && data.longitude) {
        toast.error("يرجى اختيار الموقع على الخريطة بشكل صحيح");
        return;
      }
    }

    setIsLoading(true);
    const formData = new FormData();

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || key === "images") continue;
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
        continue;
      }

      formData.append(key, String(value));
    }

    // أضف الصور فقط إذا كانت موجودة (اختيارية في التعديل)
    if (selectedImages && selectedImages.length > 0) {
      selectedImages.forEach((file) => {
        formData.append("images", file);
      });
    }

    const res = await fetch(url, {
      method,
      body: formData,
    });

    const result = await res?.json();
    if (res.ok) {
      toast.success(result.message || "تمت العملية بنجاح");
      onClose();
      router.refresh();
      reset();
    } else {
      toast.error(result.message || "حدث خطأ في العملية");
    }
  } catch (error) {
    console.error(error);
    toast.error("حدث خطأ غير متوقع");
  } finally {
    setIsLoading(false);
    reset();
  }
};

export default submitMethod;
