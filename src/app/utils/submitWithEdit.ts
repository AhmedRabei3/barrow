import toast from "react-hot-toast";
import submitMethod from "./submiteMethod";
import { SubmitHandler } from "react-hook-form";
import { FieldValues } from "react-hook-form";
import { Dispatch, SetStateAction } from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type AddCarController = {
  mode: "create" | "edit";
  initialData?: { id?: string };
  onClose: () => void;
};

interface submitWithEditProps {
  addCar: AddCarController;
  selectedImages: File[];
  data: FieldValues;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  reset: () => void;
  router: AppRouterInstance;
  createUrl: string;
  editUrl: string;
}

export const submitWithEdit = ({
  reset,
  router,
  setIsLoading,
  data,
  selectedImages,
  addCar,
  createUrl,
  editUrl,
}: submitWithEditProps) => {
  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      if (addCar.mode === "create") {
        // للإضافة: نتحقق من الصور
        if (!selectedImages || selectedImages.length === 0) {
          toast.error("يرجى اختيار الصور أولاً");
          return;
        }

        await submitMethod({
          selectedImages,
          data,
          setIsLoading,
          url: `${createUrl}`,
          onClose: addCar.onClose,
          reset,
          method: "POST",
          router,
        });
      } else if (addCar.mode === "edit" && addCar.initialData?.id) {
        // للتعديل: قد لا تكون هناك صور جديدة
        await submitMethod({
          selectedImages,
          data,
          setIsLoading,
          url: `${editUrl}`,
          onClose: addCar.onClose,
          reset,
          method: "PATCH",
          router,
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("حدث خطأ في إرسال البيانات");
    }
  };
  return onSubmit(data);
};
