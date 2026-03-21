"use client";

import IconPicker from "@/app/components/addCategory/IconPicker";
import { useForm, SubmitHandler } from "react-hook-form";
import { addNewCategoryAction } from "@/actions/category.actions";
import toast from "react-hot-toast";
import { $Enums } from "@prisma/client";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface CategoryFormValues {
  type: $Enums.ItemType;
  name: string;
  icon: string;
}

export default function AddCategoryForm() {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CategoryFormValues>({
    defaultValues: { name: "", icon: "" },
  });

  const onSubmit: SubmitHandler<CategoryFormValues> = async (data) => {
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("type", data.type);
      formData.append("icon", data.icon);

      const result = await addNewCategoryAction(formData);

      toast.success(
        result.message ||
          t("تمت إضافة الفئة بنجاح", "Category added successfully"),
      );
      reset(); // إعادة تعيين النموذج بعد الإضافة
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("فشل إضافة الفئة", "Failed to add category"),
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md p-4 sm:p-6 max-w-3xl mx-auto flex flex-col gap-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* نوع الفئة */}
        <div className="flex flex-col">
          <label
            htmlFor="category-type"
            className="text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {t("نوع الفئة", "Category Type")}
          </label>
          <select
            id="category-type"
            {...register("type", {
              required: t("نوع الفئة مطلوب", "Category type is required"),
            })}
            className={`mt-1 p-2 border rounded-md bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring focus:ring-blue-300 ${
              errors.type
                ? "border-red-500"
                : "border-slate-300 dark:border-slate-700"
            }`}
          >
            <option value="">{t("اختر النوع...", "Select type...")}</option>
            <option value="NEW_CAR">{t("سيارة جديدة", "New car")}</option>
            <option value="USED_CAR">{t("سيارة مستعملة", "Used car")}</option>
            <option value="PROPERTY">{t("عقار", "Real estate")}</option>
            <option value="OTHER">{t("أخرى", "Other")}</option>
          </select>
          {errors.type && (
            <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
          )}
        </div>

        {/* اسم الفئة */}
        <div className="flex flex-col">
          <label
            htmlFor="category-name"
            className="text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {t("اسم الفئة", "Category Name")}
          </label>
          <input
            id="category-name"
            {...register("name", {
              required: t("اسم الفئة مطلوب", "Category name is required"),
            })}
            type="text"
            placeholder={t("أدخل اسم الفئة", "Enter category name")}
            className={`mt-1 p-2 border rounded-md bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring focus:ring-blue-300 ${
              errors.name
                ? "border-red-500"
                : "border-slate-300 dark:border-slate-700"
            }`}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* أيقونة */}
        <div className="flex flex-col md:col-span-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("اختر أيقونة", "Select Icon")}
          </label>
          <IconPicker register={register} setValue={setValue} />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`mt-4 bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition ${
          isSubmitting ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        {isSubmitting
          ? t("جاري الإضافة...", "Adding...")
          : t("إضافة فئة", "Add Category")}
      </button>
    </form>
  );
}
