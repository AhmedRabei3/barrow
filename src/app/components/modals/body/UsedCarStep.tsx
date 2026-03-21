"use client";

import { FieldValues, UseFormGetValues } from "react-hook-form";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

interface UsedCarStepProps {
  step: number;
  getValues: UseFormGetValues<FieldValues>;
  selectedImages: File[];
  mode: "create" | "edit";
}

/* -----------------------------
   STEP FIELDS CONFIG
----------------------------- */
export const stepConfig = [
  {
    title: "Basic Info",
    icon: "FaCar",
    fields: ["brand", "model", "year", "categoryId"],
  },
  {
    title: "Details",
    icon: "FaListCheck",
    fields: ["sellOrRent", "price"],
  },
  {
    title: "Media",
    icon: "FaImage",
    fields: [],
  },
  {
    title: "Location",
    icon: "FaLocationDot",
    fields: ["latitude", "longitude"],
  },
];

/* -----------------------------
   MAIN LOGIC
----------------------------- */
export function useUsedCarDetailsStep({
  step,
  getValues,
  selectedImages,
  mode,
}: UsedCarStepProps) {
  const { isArabic } = useAppPreferences();
  const isCreate = mode === "create";

  const step1Fields = [
    { name: "brand", label: isArabic ? "العلامة التجارية" : "Brand" },
    { name: "model", label: isArabic ? "الموديل" : "Model" },
    { name: "year", label: isArabic ? "السنة" : "Year" },
  ];

  const validateStep = () => {
    if (!isCreate) return true; // ✨ في edit لا نمنع التقدم

    switch (step) {
      case 0:
        return (
          !!getValues("brand") &&
          !!getValues("model") &&
          !!getValues("year") &&
          !!getValues("categoryId")
        );

      case 1:
        if (getValues("sellOrRent") === "RENT") {
          return !!getValues("rentType") && !!getValues("price");
        }
        return !!getValues("price");

      case 2:
        return selectedImages.length > 0;

      case 3:
        return (
          !!getValues("latitude") &&
          !!getValues("longitude") &&
          getValues("latitude") !== 0 &&
          getValues("longitude") !== 0
        );

      default:
        return true;
    }
  };

  return {
    step1Fields,
    validateStep,
  };
}

/* -----------------------------
   STEP INDICATOR (UI)
----------------------------- */
interface StepperProps {
  currentStep: number;
}

export function Stepper({ currentStep }: StepperProps) {
  const { isArabic } = useAppPreferences();
  const localizedStepConfig = stepConfig.map((s) => ({
    ...s,
    title: isArabic
      ? s.title === "Basic Info"
        ? "معلومات أساسية"
        : s.title === "Details"
          ? "التفاصيل"
          : s.title === "Media"
            ? "الوسائط"
            : s.title === "Location"
              ? "الموقع"
              : s.title
      : s.title,
  }));

  return (
    <div className="flex justify-between items-center mb-6">
      {localizedStepConfig.map((s, index) => {
        const isActive = index === currentStep;
        const isDone = index < currentStep;

        return (
          <div key={index} className="flex-1 flex items-center">
            <div
              className={`flex flex-col items-center justify-center w-10 h-10 rounded-full border-2 transition
                ${
                  isDone
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : isActive
                      ? "bg-sky-600 border-sky-600 text-white"
                      : "bg-white border-gray-300 text-gray-400"
                }
              `}
            >
              <DynamicIcon iconName={s.icon} size={16} />
            </div>

            <span
              className={`mt-1 text-xs text-center w-full
                ${
                  isActive
                    ? "text-sky-700 font-semibold"
                    : isDone
                      ? "text-emerald-600"
                      : "text-gray-400"
                }
              `}
            >
              {s.title}
            </span>

            {index < localizedStepConfig.length - 1 && (
              <div
                className={`flex-1 h-1 mx-1 rounded transition
                  ${isDone ? "bg-emerald-600" : "bg-gray-300"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
