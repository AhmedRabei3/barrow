"use client";

import { Dispatch, SetStateAction, useState } from "react";
import {
  FieldValues,
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  UseFormGetValues,
  FormState,
} from "react-hook-form";

import FormInput from "./FormInputs";
import CategoryDropDown from "../usedCar/CategoryDropDown";
import CostumRadioGroup from "../usedCar/InputPanel";
import ImageUpload from "../../imageUploader/ImageUpload";
import { DynamicIcon } from "../../addCategory/IconSetter";
import { $Enums } from "@prisma/client";
import Description from "../../Description";
import LocationSelector from "../../LocationSelector";
import { useUsedCarStep } from "./useCarStep";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

interface WizardFormProps {
  register: UseFormRegister<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  getValues: UseFormGetValues<FieldValues>;
  formState: FormState<FieldValues>;
  categories: {
    id: string;
    name: string;
    type: $Enums.ItemType;
    icon: string | null;
  }[];
  loading: boolean;
  setSelectedImages: Dispatch<SetStateAction<File[]>>;
  onSubmit: (() => void) | undefined;
  selectedImages: File[];
  isEditMode: boolean;
  mode: "create" | "edit";
}

const WizardForm = ({
  register,
  watch,
  setValue,
  getValues,
  formState,
  categories,
  setSelectedImages,
  onSubmit,
  selectedImages,
  loading,
  isEditMode = false,
  mode = "create",
}: WizardFormProps) => {
  const { isArabic } = useAppPreferences();
  const [step, setStep] = useState(0);

  const { errors } = formState;

  const { step1Fields, validateStep } = useUsedCarStep({
    step,
    getValues,
    selectedImages,
  });
  const isRequired = mode === "create";

  // --- Step Controls ---
  const nextStep = () =>
    validateStep() && setStep((prev) => Math.min(prev + 1, isEditMode ? 2 : 3));
  const prevStep = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="flex flex-col gap-4">
      {/* STEP 0 ----------------------------- */}
      {step === 0 && (
        <div
          className="
            grid grid-cols-1 
            md:grid-cols-2 
            gap-4 bg-white 
            p-4 rounded-lg shadow
          "
        >
          <div className="col-span-2">
            <CategoryDropDown
              categories={categories}
              register={register}
              watch={watch}
              setValue={setValue}
            />
            {isRequired && !getValues("categoryId") && (
              <p className="text-red-500 text-xs mt-1">
                {isArabic ? "التصنيف مطلوب" : "Category is required"}
              </p>
            )}
          </div>

          {step1Fields.map((field) => (
            <div
              key={field.name}
              className={`flex flex-col gap-1 p-2 rounded-md border transition
          ${
            isRequired && !getValues(field.name)
              ? "border-red-500 bg-red-50"
              : "border-slate-300"
          }`}
            >
              <FormInput {...field} register={register} required={isRequired} />
              {isRequired && !getValues(field.name) && (
                <p className="text-red-500 text-xs">
                  {isArabic ? "هذا الحقل مطلوب" : "This field is required"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* STEP 1 ----------------------------- */}
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <CostumRadioGroup register={register} watch={watch} />

          {watch("sellOrRent") === "RENT" && !watch("rentType") && (
            <p className="text-red-500 text-sm p-2 bg-red-50 rounded border border-red-300">
              {isArabic
                ? "⚠️ يرجى اختيار نوع الإيجار قبل المتابعة"
                : "⚠️ Please choose rent type before continuing"}
            </p>
          )}

          <div className="flex gap-2">
            {/* repaint & reassembled */}
            <div className="flex flex-col justify-between">
              {/* repaint */}
              <label
                className="
                  flex items-center gap-2 cursor-pointer text-neutral-700
                  peer-checked:text-sky-700 peer-checked:bg-sky-100 w-full py-1 rounded
                "
              >
                <input
                  id="repainted"
                  type="checkbox"
                  {...register("repainted")}
                  className="peer hidden"
                />

                <DynamicIcon
                  iconName="TbPaintOff"
                  size={16}
                  className="peer-checked:hidden"
                />
                <DynamicIcon
                  iconName="FaPaintRoller"
                  size={16}
                  className="hidden peer-checked:block"
                />
                <span>{isArabic ? "معاد الدهان" : "Repainted"}</span>
              </label>

              {/* reassembled */}
              <label
                className="
                  flex items-center gap-2 cursor-pointer text-neutral-700
                  peer-checked:text-sky-700 peer-checked:bg-sky-100 w-full py-1 rounded
                "
              >
                <input
                  id="reassembled"
                  type="checkbox"
                  {...register("reAssembled")}
                  className="peer hidden"
                />

                <DynamicIcon
                  iconName="TbAssemblyOff"
                  size={16}
                  className="peer-checked:hidden"
                />
                <DynamicIcon
                  iconName="TbAssemblyFilled"
                  size={16}
                  className="hidden peer-checked:block "
                />
                <span>{isArabic ? "معاد التجميع" : "Reassembled"}</span>
              </label>
            </div>

            {/* price */}
            <div
              className={`flex-1 flex flex-col gap-1 border p-2 rounded-md ${
                !getValues("price")
                  ? "border-red-500 bg-red-50"
                  : "border-slate-300"
              }`}
            >
              <label className="flex items-center justify-between text-sm text-neutral-700">
                {isArabic ? "السعر" : "Price"}{" "}
                <DynamicIcon iconName="AiOutlineDollar" size={16} />
              </label>

              <input
                type="number"
                {...register("price", { required: true, valueAsNumber: true })}
                className={`border px-1 py-1 rounded w-full ${
                  !getValues("price") ? "border-red-500" : ""
                }`}
              />
              {!getValues("price") && (
                <p className="text-red-500 text-xs mt-1">
                  {isArabic ? "السعر مطلوب" : "Price is required"}
                </p>
              )}
            </div>

            {/* color */}
            <div className="flex-1 flex flex-col gap-1 border border-slate-300 p-2 rounded-md">
              <label className="flex items-center justify-between text-sm text-neutral-700">
                {isArabic ? "اللون" : "Color"}{" "}
                <DynamicIcon iconName="RiPaintFill" size={16} />
              </label>

              <input
                type="color"
                {...register("color")}
                className="w-full h-10 border-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 ----------------------------- */}
      {step === 2 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-neutral-700 mb-2">
              {isArabic ? "الوصف" : "Description"}
            </label>
            <Description name="description" register={register} label="" />
            <p className="text-gray-500 text-xs mt-1">
              {isArabic
                ? "اختياري - أضف أي تفاصيل إضافية عن المركبة"
                : "Optional - Add any additional details about the vehicle"}
            </p>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-neutral-700 mb-2">
              {isArabic ? "الصور" : "Images"}{" "}
              {selectedImages.length === 0 && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <div
              className={`border-2 border-dashed rounded-md p-2 ${
                selectedImages.length === 0
                  ? "border-red-500 bg-red-50"
                  : "border-sky-700"
              }`}
            >
              <ImageUpload
                selectedImages={selectedImages}
                setSelectedImages={setSelectedImages}
              />
            </div>
            {selectedImages.length === 0 && (
              <p className="text-red-500 text-xs mt-1">
                {isArabic
                  ? "الرجاء رفع صورة واحدة على الأقل"
                  : "Please upload at least one image"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 3 ----------------------------- */}
      {step === 3 && (
        <div className="flex flex-col gap-3">
          {(!getValues("latitude") ||
            !getValues("longitude") ||
            getValues("latitude") === 0 ||
            getValues("longitude") === 0) && (
            <p className="text-red-500 text-sm p-2 bg-red-50 rounded border border-red-300">
              {isArabic
                ? "⚠️ يرجى اختيار الموقع على الخريطة قبل المتابعة"
                : "⚠️ Please choose a location on the map before continuing"}
            </p>
          )}
          <LocationSelector setValue={setValue} errors={errors} />
        </div>
      )}

      {/* BUTTONS ----------------------------- */}
      <div className="flex justify-between mt-4">
        {step > 0 && (
          <button
            onClick={prevStep}
            type="button"
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          >
            {isArabic ? "السابق" : "Previous"}
          </button>
        )}

        {step < 3 ? (
          <button
            onClick={nextStep}
            type="button"
            disabled={!validateStep()}
            className={`px-4 py-2 rounded bg-sky-900 text-white transition ${
              !validateStep() ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isArabic ? "التالي" : "Next"}
          </button>
        ) : !loading ? (
          <button
            onClick={onSubmit}
            type="button"
            className="
             px-6 py-2 rounded bg-emerald-600
             text-white hover:bg-emerald-700 
             transition"
          >
            {isArabic ? "إرسال" : "Submit"}
          </button>
        ) : (
          <div className="spinner w-5"></div>
        )}
        {!loading && mode === "edit" && (
          <button
            onClick={onSubmit}
            type="button"
            className="px-6 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            {isArabic ? "حفظ التعديلات" : "Save Changes"}
          </button>
        )}
      </div>
    </div>
  );
};

export default WizardForm;
