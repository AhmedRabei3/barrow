"use client";

import { memo, useEffect, useState } from "react";
import h from "@/app/hooks";
import Modal from "../Modal";
import { FieldValues, SubmitHandler } from "react-hook-form";
import categoryFetcher from "../../category/CategoryFetcher";
import { $Enums } from "@prisma/client";
import submitMethod from "@/app/utils/submiteMethod";
import FormUsedCar from "../body/FormUsedCar";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAddUsedCarForm } from "../../../hooks/useAddUsedCarForm";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

type Category = {
  name: string;
  icon: string | null;
  type: $Enums.ItemType;
  id: string;
  isDeleted: boolean;
};

const AddUsedCarModal = () => {
  const router = useRouter();
  const addCar = h.useUsedCarModal();
  const { isArabic } = useAppPreferences();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const type = $Enums.ItemType.USED_CAR;

  useEffect(() => {
    categoryFetcher({ setList: setCategories, type });
  }, [type]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState,
    reset,
  } = useAddUsedCarForm();

  useEffect(() => {
    if (addCar.isOpen && addCar.mode === "edit" && addCar.initialData) {
      const data = addCar.initialData;

      const mapped = {
        brand: data.brand ?? "",
        model: data.model ?? "",
        year: data.year ?? 1990,
        color: data.color ?? "#000000",
        price: data.price ?? 100,
        categoryId: data.categoryId ?? "",
        gearType: data.gearType ?? "AUTOMATIC",
        fuelType: data.fuelType ?? "GASOLINE",
        description: data.description ?? "",
        rentType: data.rentType ?? "",
        sellOrRent: data.sellOrRent ?? "SELL",
        status: data.status ?? "AVAILABLE",
        repainted: data.repainted ?? false,
        reAssembled: data.reAssembled ?? false,
        mileage: data.mileage ?? 0,

        latitude: data.latitude ?? 0,
        longitude: data.longitude ?? 0,
        city: data.city ?? "",
        address: data.address ?? "",
        state: data.state ?? "",
        country: data.country ?? "",
      };
      reset(mapped);
    } else if (addCar.isOpen && addCar.mode === "create") {
      reset();
    }
  }, [addCar.isOpen, addCar.mode, addCar.initialData, reset]);

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      if (addCar.mode === "create") {
        // للإضافة: نتحقق من الصور
        if (!selectedImages || selectedImages.length === 0) {
          toast.error(
            isArabic ? "يرجى اختيار الصور أولاً" : "Please select images first",
          );
          return;
        }
        submitMethod({
          selectedImages,
          data,
          setIsLoading,
          url: "/api/cars/used_car",
          onClose: addCar.onClose,
          reset,
          router,
        });
      } else if (addCar.mode === "edit" && addCar.initialData?.id) {
        // للتعديل: قد لا تكون هناك صور جديدة
        await submitMethod({
          selectedImages,
          data,
          setIsLoading,
          url: `/api/cars/used_car/${addCar.initialData?.id}`,
          onClose: addCar.onClose,
          reset,
          method: "PATCH",
          router,
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(
        isArabic
          ? "حدث خطأ في إرسال البيانات"
          : "An error occurred while submitting data",
      );
    }
  };

  const handleClose = () => {
    reset();
    setSelectedImages([]);
    addCar.onClose();
  };

  return (
    <Modal
      disabled={isLoading}
      isOpen={addCar.isOpen}
      title={
        addCar.mode === "edit"
          ? isArabic
            ? "تعديل بيانات السيارة"
            : "Edit used car"
          : isArabic
            ? "إضافة سيارة مستعملة"
            : "Add used car"
      }
      actionLabel={
        addCar.mode === "edit"
          ? isArabic
            ? "حفظ التعديلات"
            : "Save changes"
          : isArabic
            ? "إضافة"
            : "Add"
      }
      onClose={handleClose}
      body={
        <FormUsedCar
          selectedImages={selectedImages}
          getValues={getValues}
          formState={formState}
          register={register}
          watch={watch}
          loading={isLoading}
          categories={categories}
          setValue={setValue}
          setSelectedImages={setSelectedImages}
          onSubmit={handleSubmit(onSubmit)}
          isEditMode={addCar.mode === "edit" ? true : false}
          mode={addCar.mode === "edit" ? "edit" : "create"}
        />
      }
    />
  );
};

export default memo(AddUsedCarModal);
