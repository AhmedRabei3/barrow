"use client";
import { useCallback } from "react";
import { FieldValues, UseFormGetValues } from "react-hook-form";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

interface stepProps {
  step: number;
  getValues: UseFormGetValues<FieldValues>;
  selectedImages: File[];
}

export const useUsedCarStep = ({
  step,
  getValues,
  selectedImages,
}: stepProps) => {
  const { isArabic } = useAppPreferences();

  // --- Step Fields ---
  const step1Fields = [
    {
      name: "brand" as const,
      label: isArabic ? "العلامة التجارية" : "Brand",
      placeholder: isArabic ? "مثال: مرسيدس" : "e.g. Mercedes",
      type: "text",
    },
    {
      name: "model" as const,
      label: isArabic ? "الموديل" : "Model",
      placeholder: "W202",
      type: "text",
    },
    {
      name: "year" as const,
      label: isArabic ? "سنة الصنع" : "Year",
      placeholder: "2000",
      type: "number",
    },
    {
      name: "mileage" as const,
      label: isArabic ? "الممشى (كم)" : "Mileage (K.M)",
      placeholder: "20000",
      type: "number",
    },
  ];

  // --- Step Validation ---
  const validateStep = useCallback(() => {
    if (step === 0) {
      const categoryId = getValues("categoryId");
      const brand = getValues("brand");
      const model = getValues("model");
      const year = getValues("year");
      const mileage = getValues("mileage");

      return !!categoryId && !!brand && !!model && !!year && !!mileage;
    }

    if (step === 1) {
      const sellOrRent = getValues("sellOrRent");
      const price = getValues("price");
      const gearType = getValues("gearType");
      const fuelType = getValues("fuelType");

      // If RENT is selected, rentType is required
      if (sellOrRent === "RENT") {
        const rentType = getValues("rentType");
        return !!price && !!gearType && !!fuelType && !!rentType;
      }

      return !!price && !!gearType && !!fuelType;
    }

    if (step === 2) {
      return selectedImages.length > 0;
    }

    if (step === 3) {
      const latitude = getValues("latitude");
      const longitude = getValues("longitude");
      return !!latitude && !!longitude && latitude !== 0 && longitude !== 0;
    }

    return true;
  }, [step, getValues, selectedImages.length]);
  return { step1Fields, validateStep };
};
