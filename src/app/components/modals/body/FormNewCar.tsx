"use client";

import toast from "react-hot-toast";
import FormInput from "./FormInputs";
import CategoryDropDown from "../usedCar/CategoryDropDown";
import CostumRadioGroup from "../usedCar/InputPanel";
import ImageUpload from "../../imageUploader/ImageUpload";
import { DynamicIcon } from "../../addCategory/IconSetter";
import { AddNewCarProps } from "./GeneralProps";
import LocationSelector from "../../LocationSelector";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

const WizardForm = ({
  register,
  watch,
  setValue,
  categories,
  setSelectedImages,
  selectedImages,
  errors,
  isEditMode = false,
  step = 0,
  setStep,
  trigger,
}: AddNewCarProps) => {
  const { isArabic } = useAppPreferences();

  // حقول الخطوة 1
  const step1Fields = [
    {
      name: "brand",
      label: isArabic ? "العلامة التجارية" : "Brand",
      placeholder: isArabic ? "مثال: مرسيدس" : "e.g. Mercedes",
      type: "text",
    },
    {
      name: "model",
      label: isArabic ? "الموديل" : "Model",
      placeholder: "W202",
      type: "text",
    },
    {
      name: "year",
      label: isArabic ? "سنة الصنع" : "Year",
      placeholder: isArabic ? "مثال: 2000" : "e.g. 2000",
      type: "number",
    },
  ];

  const maxStep = isEditMode ? 2 : 3;

  const prevStep = () => setStep && setStep((prev) => Math.max(prev - 1, 0));

  const nextStep = async () => {
    if (!setStep) return;

    // validate per step
    let ok: boolean = true;
    try {
      if (step === 0) {
        ok = !(
          (await (trigger &&
            trigger(["categoryId", "brand", "model", "year"]))) === false
        );
      }

      if (step === 1) {
        const base = await (trigger &&
          trigger(["sellOrRent", "price", "color", "fuelType", "gearType"]));
        if (watch!("sellOrRent") === "RENT") {
          const rentOk = await (trigger && trigger(["rentType"]));
          if (base && rentOk) ok = base && rentOk;
        } else ok = !!base;
      }

      if (step === 2 && !isEditMode) {
        // images required in create mode
        if (!selectedImages || selectedImages.length === 0) {
          toast.error(
            isArabic
              ? "يرجى رفع صورة واحدة على الأقل"
              : "Please upload at least one image",
          );
          ok = false;
        }
      }

      if (step === maxStep) {
        // final step, validate location
        ok = !(
          (await (trigger &&
            trigger(["latitude", "longitude", "city", "address"]))) === false
        );
      }
    } catch {
      ok = false;
    }

    if (ok) setStep((s) => Math.min(s + 1, maxStep));
  };

  return (
    <div className="flex flex-col gap-4">
      {step === 0 && (
        <div className="flex flex-col gap-3">
          <CategoryDropDown
            categories={categories}
            register={register}
            watch={watch}
            setValue={setValue}
          />
          {step1Fields.map((field) => (
            <FormInput
              key={field.name}
              {...field}
              register={register}
              required
            />
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <CostumRadioGroup register={register} watch={watch} />
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1 border border-slate-300 p-2 rounded-md">
              <label className="flex items-center justify-between text-sm text-neutral-700">
                {isArabic ? "السعر" : "Price"}{" "}
                <DynamicIcon iconName="AiOutlineDollar" size={16} />
              </label>
              <input
                type="number"
                {...register("price", { valueAsNumber: true })}
                className="border px-1 py-1 rounded w-full"
              />
            </div>

            <div className="flex-1 flex flex-col gap-1 border border-slate-300 p-2 rounded-md">
              <label className="flex items-center justify-between text-sm text-neutral-700">
                {isArabic ? "اللون" : "Color"}{" "}
                <DynamicIcon iconName="RiPaintFill" size={16} />
              </label>
              <input
                type="color"
                {...register("color")}
                className="w-full h-10 border-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* في وضع الإضافة: خطوة الصور والوصف */}
      {!isEditMode && step === 2 && (
        <div className="flex flex-col gap-3">
          <ImageUpload
            selectedImages={selectedImages || []}
            setSelectedImages={setSelectedImages}
          />
          <label htmlFor="description" className="text-sm text-neutral-700">
            {isArabic ? "الوصف:" : "Description:"}
          </label>
          <textarea
            id="description"
            {...register("description")}
            rows={4}
            className="border border-slate-400 rounded-md px-2 text-sm"
            placeholder={isArabic ? "ميزات إضافية" : "Other features"}
          />
        </div>
      )}

      {/* في وضع التعديل: خطوة الموقع (بدون صور) */}
      {isEditMode && step === 2 && (
        <div className="flex flex-col gap-3">
          <label htmlFor="description" className="text-sm text-neutral-700">
            {isArabic ? "الوصف:" : "Description:"}
          </label>
          <textarea
            id="description"
            {...register("description")}
            rows={4}
            className="border border-slate-400 rounded-md px-2 text-sm"
            placeholder={isArabic ? "ميزات إضافية" : "Other features"}
          />
          <LocationSelector setValue={setValue} errors={errors} />
        </div>
      )}

      {/* في وضع الإضافة فقط: خطوة الموقع */}
      {!isEditMode && step === 3 && (
        <LocationSelector setValue={setValue} errors={errors} />
      )}

      {/* أزرار التنقل بين الخطوات */}
      <div className="flex justify-between mt-4">
        {step > 0 && (
          <button onClick={prevStep} className="px-4 py-2 border rounded">
            {isArabic ? "السابق" : "Previous"}
          </button>
        )}
        {step < (isEditMode ? 2 : 3) && (
          <button
            onClick={nextStep}
            className="px-4 py-2 border rounded bg-sky-900 text-white"
            type="button"
          >
            {isArabic ? "التالي" : "Next"}
          </button>
        )}
      </div>
    </div>
  );
};

export default WizardForm;
