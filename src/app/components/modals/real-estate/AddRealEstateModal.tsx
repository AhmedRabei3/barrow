"use client";

import { useEffect, useState } from "react";
import h from "@/app/hooks";
import Modal from "../Modal";
import { FieldValues, SubmitHandler } from "react-hook-form";
import categoryFetcher from "../../category/CategoryFetcher";
import { $Enums } from "@prisma/client";
import submitMethod from "@/app/utils/submiteMethod";
import { useRouter } from "next/navigation";
import StepBasicInfo from "./StepBasicInfo";
import StepNumbers from "./StepNumbers";
import StepImages from "./StepImages";
import StepExtraInfo from "./StepExtraInfo";
import LocationSelector from "../../LocationSelector";
import Wizard from "../../wizard/Wizard";
import { useAddRealEstateForm } from "../../../hooks/useAddUsedCarForm";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

type Category = {
  name: string;
  icon: string | null;
  type: $Enums.ItemType;
  id: string;
  isDeleted: boolean;
};

const AddPropertyModal = () => {
  const router = useRouter();
  const { onClose, isOpen } = h.usePropertyModal();
  const { isArabic } = useAppPreferences();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const type: $Enums.ItemType = "PROPERTY";

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
  } = useAddRealEstateForm();

  const { errors } = formState;

  const steps = [
    <StepBasicInfo
      key="property-basic"
      register={register}
      categories={categories}
      watch={watch}
      setValue={setValue}
    />,
    <StepExtraInfo
      key="property-extra"
      register={register}
      setValue={setValue}
      getValues={getValues}
    />,
    <StepImages
      key="property-images"
      formState={formState}
      setSelectedImages={setSelectedImages}
      selectedImages={selectedImages}
    />,
    <StepNumbers
      key="property-numbers"
      register={register}
      watch={watch}
      setValue={setValue}
    />,
    <LocationSelector
      key="property-location"
      setValue={setValue}
      errors={errors}
    />,
  ];

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    await submitMethod({
      selectedImages,
      data,
      setIsLoading,
      url: "/api/realestate",
      router,
      onClose,
      reset,
    });
  };

  return (
    <Modal
      disabled={isLoading}
      isOpen={isOpen}
      title={isArabic ? "إضافة عقار" : "Add Property"}
      actionLabel={isArabic ? "حفظ" : "Save"}
      onClose={onClose}
      reset={reset}
      onSubmit={handleSubmit(onSubmit)}
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

export default AddPropertyModal;
