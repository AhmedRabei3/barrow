"use client";

import { useEffect, useState } from "react";
import h from "@/app/hooks";
import Modal from "../Modal";
import { FieldValues, SubmitHandler } from "react-hook-form";
import categoryFetcher from "../../category/CategoryFetcher";
import { $Enums } from "@prisma/client";
import submitMethod from "@/app/utils/submiteMethod";
import { useRouter } from "next/navigation";
import { createOtherItemSchema } from "@/app/validations";
import LocationSelector from "../../LocationSelector";
import Wizard from "../../wizard/Wizard";
import StepImages from "../real-estate/StepImages";
import OtherBasicInfo from "./OtherBasicInfo";
import toast from "react-hot-toast";
import { useAddOtherForm } from "../../../hooks/useAddUsedCarForm";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

type Category = {
  name: string;
  icon: string | null;
  type: $Enums.ItemType;
  id: string;
  isDeleted: boolean;
};

const AddOtherModal = () => {
  const { onClose, isOpen } = h.useAddOther();
  const { isArabic } = useAppPreferences();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const type: $Enums.ItemType = "OTHER";

  useEffect(() => {
    categoryFetcher({ setList: setCategories, type });
  }, [type]);

  const { register, handleSubmit, watch, setValue, formState, reset } =
    useAddOtherForm();
  const { errors } = formState;

  const steps = [
    <OtherBasicInfo
      key="other-basic"
      register={register}
      setValue={setValue}
      watch={watch}
      categories={categories}
    />,
    <StepImages
      key="other-images"
      formState={formState}
      setSelectedImages={setSelectedImages}
      selectedImages={selectedImages}
    />,
    <LocationSelector
      key="other-location"
      setValue={setValue}
      errors={errors}
    />,
  ];

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    const parced = createOtherItemSchema.safeParse(data);
    if (!parced.success) {
      toast.error(isArabic ? "البيانات غير صالحة" : "Invalid data");
      return;
    }
    await submitMethod({
      selectedImages,
      data,
      setIsLoading,
      url: "/api/otherItems",
      onClose,
      reset,
      method: "POST",
      router,
    });
  };

  return (
    <Modal
      disabled={isLoading}
      isOpen={isOpen}
      title={isArabic ? "إضافة عنصر جديد" : "Add new item"}
      actionLabel={isArabic ? "حفظ" : "Save"}
      onClose={onClose}
      reset={reset}
      body={
        <Wizard
          onSubmit={onSubmit}
          handleSubmit={handleSubmit}
          steps={steps}
          loading={isLoading}
        />
      }
    />
  );
};

export default AddOtherModal;
