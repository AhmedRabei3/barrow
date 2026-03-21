"use client";

import { useEffect, useState } from "react";
import useAddCarModal from "@/app/hooks/useAddCarModal";
import Modal from "./Modal";
import { FieldValues, SubmitHandler } from "react-hook-form";
import FormNewCar from "./body/FormNewCar";
import categoryFetcher from "../category/CategoryFetcher";
import { $Enums, Category } from "@prisma/client";
import submitMethod from "@/app/utils/submiteMethod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { useAddNewCarForm } from "../../hooks/useAddUsedCarForm";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

type DraftImage = {
  name: string;
  type: string;
  dataUrl: string;
};

type DraftPayload = {
  values?: FieldValues;
  step?: number;
  images?: DraftImage[];
};

const AddCarModal = () => {
  const router = useRouter();
  const addCar = useAddCarModal();
  const { isArabic } = useAppPreferences();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState(0);

  const type = $Enums.ItemType.NEW_CAR;

  useEffect(() => {
    categoryFetcher({ setList: setCategories, type });
  }, [type]);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useAddNewCarForm();

  // عند فتح المودال للتعديل، ملء البيانات الأولية
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
  }, [addCar.isOpen, addCar.mode, addCar.initialData, setValue, reset]);

  // Autosave draft key
  const DRAFT_KEY = "newcar:draft";

  // Restore draft (values + images + step) when opening create modal
  useEffect(() => {
    const restore = async () => {
      if (!addCar.isOpen) return;
      if (addCar.mode !== "create") return;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed.values) {
          reset(parsed.values);
        }
        if (typeof parsed.step === "number") setStep(parsed.step);

        if (parsed.images && parsed.images.length) {
          const files: File[] = (
            await Promise.all(
              (parsed.images as DraftImage[]).map(async (img, idx: number) => {
                try {
                  const res = await fetch(img.dataUrl);
                  const blob = await res.blob();
                  const name = img.name || `restored-${idx}`;
                  return new File([blob], name, {
                    type: blob.type || img.type || "image/jpeg",
                  });
                } catch {
                  return null;
                }
              }),
            )
          ).filter(Boolean) as File[];

          if (files.length) setSelectedImages(files);
        }
      } catch (err) {
        console.warn("Failed to restore draft", err);
      }
    };
    restore();
  }, [addCar.isOpen, addCar.mode, reset]);

  // Save form values on change (values + step)
  useEffect(() => {
    if (addCar.mode !== "create") return;
    const unsubscribe = watch((value) => {
      try {
        const existing = localStorage.getItem(DRAFT_KEY);
        const parsed: DraftPayload = existing ? JSON.parse(existing) : {};
        const toSave: DraftPayload = {
          ...(parsed || {}),
          values: value as FieldValues,
          step,
        };
        // keep previously saved images (updated in separate effect)
        toSave.images = parsed.images || [];
        localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave));
      } catch {
        /* ignore */
      }
    });

    // react-hook-form's watch returns an unsubscribe function when called with a callback
    const unsub = unsubscribe as unknown as (() => void) | undefined;
    return () => {
      try {
        if (unsub) unsub();
      } catch {
        /* ignore */
      }
    };
  }, [watch, step, addCar.mode]);

  // Save images as dataUrls when they change
  useEffect(() => {
    if (addCar.mode !== "create") return;
    const saveImages = async () => {
      try {
        const list = await Promise.all(
          selectedImages.map(
            (file) =>
              new Promise<DraftImage | null>((res) => {
                const reader = new FileReader();
                reader.onload = () => {
                  res({
                    name: file.name,
                    type: file.type,
                    dataUrl: String(reader.result || ""),
                  });
                };
                reader.onerror = () => res(null);
                reader.readAsDataURL(file);
              }),
          ),
        );
        const existing = localStorage.getItem(DRAFT_KEY);
        const parsed: DraftPayload = existing ? JSON.parse(existing) : {};
        parsed.images = list.filter((img): img is DraftImage => img !== null);
        localStorage.setItem(DRAFT_KEY, JSON.stringify(parsed));
      } catch {
        console.warn("failed to save images draft");
      }
    };
    saveImages();
  }, [selectedImages, addCar.mode]);

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

        await submitMethod({
          selectedImages,
          data,
          setIsLoading,
          url: "/api/cars",
          onClose: addCar.onClose,
          reset,
          method: "POST",
          router,
        });
        // clear draft after successful create
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
      } else if (addCar.mode === "edit" && addCar.initialData?.id) {
        // للتعديل: قد لا تكون هناك صور جديدة
        await submitMethod({
          selectedImages,
          data,
          setIsLoading,
          url: `/api/cars/new_car/${addCar.initialData.id}`,
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

  // whether current step is final for this mode
  const maxStep = addCar.mode === "edit" ? 2 : 3;
  const isFinalStep = step === maxStep;

  // wrapper used by Modal primary action: advance wizard until final step, then validate & submit
  const handlePrimary = () => {
    if (!isFinalStep) {
      setStep((s) => Math.min(s + 1, maxStep));
      return;
    }
    // final: validate whole form and submit
    handleSubmit(onSubmit)();
  };

  return (
    <Modal
      disabled={isLoading || (isFinalStep && !isValid)}
      isOpen={addCar.isOpen}
      title={
        addCar.mode === "edit"
          ? isArabic
            ? "تعديل السيارة"
            : "Edit car"
          : isArabic
            ? "إضافة سيارة جديدة"
            : "Add new car"
      }
      actionLabel={
        addCar.mode === "edit"
          ? isArabic
            ? "حفظ التعديلات"
            : "Save changes"
          : isArabic
            ? "إضافة السيارة"
            : "Add car"
      }
      onClose={addCar.onClose}
      onSubmit={handlePrimary}
      reset={reset}
      body={
        <FormNewCar
          register={register}
          watch={watch}
          categories={categories}
          setValue={setValue}
          setSelectedImages={setSelectedImages}
          selectedImages={selectedImages}
          reset={reset}
          errors={errors}
          isEditMode={addCar.mode === "edit"}
          step={step}
          setStep={setStep}
          trigger={trigger}
        />
      }
    />
  );
};

export default memo(AddCarModal);
