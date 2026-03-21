import React from "react";
import ImageUpload from "../../imageUploader/ImageUpload";
import { FieldValues, FormState } from "react-hook-form";
import { Dispatch, SetStateAction } from "react";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

interface stepImageProps {
  formState: FormState<FieldValues>;
  setSelectedImages: Dispatch<SetStateAction<File[]>>;
  selectedImages?: File[];
}

const StepImages = ({
  formState,
  setSelectedImages,
  selectedImages,
}: stepImageProps) => {
  const { isArabic } = useAppPreferences();
  const { errors } = formState;
  return (
    <div className="h-full">
      <ImageUpload
        selectedImages={selectedImages || []}
        setSelectedImages={setSelectedImages}
      />

      {errors.images && (
        <p className="text-red-500 text-xs mt-1">
          {isArabic
            ? "مطلوب صورة واحدة على الأقل"
            : "At least one image is required"}
        </p>
      )}
    </div>
  );
};

export default StepImages;
