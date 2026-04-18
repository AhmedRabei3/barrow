"use client";

import IconPicker from "@/app/components/addCategory/IconPicker";
import categoryFetcher, {
  clearCategoriesCache,
} from "@/app/components/category/CategoryFetcher";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  addNewCategoryAction,
  updateCategoryAction,
} from "@/actions/category.actions";
import toast from "react-hot-toast";
import { $Enums } from "@prisma/client";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { useEffect, useMemo, useState } from "react";
import { DynamicIcon } from "./IconSetter";
import { FaRegEdit } from "react-icons/fa";

interface CategoryFormValues {
  type: $Enums.ItemType;
  nameAr: string;
  nameEn: string;
  icon: string;
}

type CategoryRow = {
  id: string;
  type: $Enums.ItemType;
  name: string;
  nameAr?: string | null;
  nameEn?: string | null;
  icon: string | null;
};

type ActiveTab = "add" | "existing";

export default function AddCategoryForm() {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [activeTab, setActiveTab] = useState<ActiveTab>("add");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CategoryFormValues>({
    defaultValues: { nameAr: "", nameEn: "", icon: "" },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    setValue: setEditValue,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isUpdating },
  } = useForm<CategoryFormValues>();

  const editingCategory = useMemo(
    () => categories.find((item) => item.id === editingId) ?? null,
    [categories, editingId],
  );

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const list = await categoryFetcher({});
      setCategories(list as CategoryRow[]);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (activeTab === "existing") {
      loadCategories();
    }
  }, [activeTab]);

  const onSubmit: SubmitHandler<CategoryFormValues> = async (data) => {
    try {
      const formData = new FormData();
      formData.append("nameAr", data.nameAr.trim());
      formData.append("nameEn", data.nameEn.trim());
      formData.append("type", data.type);
      formData.append("icon", data.icon);

      const result = await addNewCategoryAction(formData);

      if (!result.success) {
        throw new Error(result.message || t("فشلت العملية", "Action failed"));
      }

      clearCategoriesCache();

      toast.success(
        result.message ||
          t("تمت إضافة الفئة بنجاح", "Category added successfully"),
      );
      reset(); // إعادة تعيين النموذج بعد الإضافة
      if (activeTab === "existing") {
        await loadCategories();
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("فشل إضافة الفئة", "Failed to add category"),
      );
    }
  };

  const startEdit = (category: CategoryRow) => {
    setEditingId(category.id);
    resetEdit({
      type: category.type,
      nameAr: category.nameAr ?? "",
      nameEn: category.nameEn ?? category.name ?? "",
      icon: category.icon ?? "",
    });
  };

  const onSubmitEdit: SubmitHandler<CategoryFormValues> = async (data) => {
    if (!editingId) return;

    try {
      const formData = new FormData();
      formData.append("id", editingId);
      formData.append("nameAr", data.nameAr.trim());
      formData.append("nameEn", data.nameEn.trim());
      formData.append("type", data.type);
      formData.append("icon", data.icon);

      const result = await updateCategoryAction(formData);

      if (!result.success) {
        throw new Error(result.message || t("فشلت العملية", "Action failed"));
      }

      clearCategoriesCache();
      toast.success(result.message || t("تم التحديث", "Updated successfully"));
      setEditingId(null);
      resetEdit();
      await loadCategories();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("فشل تحديث الفئة", "Failed to update category"),
      );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md p-4 sm:p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("add")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === "add"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          }`}
        >
          {t("إضافة فئة جديدة", "Add new category")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("existing")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === "existing"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          }`}
        >
          {t("الفئات الحالية", "Current categories")}
        </button>
      </div>

      {activeTab === "add" ? (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <option value="NEW_CAR">
                  {t("سيارة (جديدة ومستعملة)", "Cars (new & used)")}
                </option>
                <option value="PROPERTY">{t("عقار", "Real estate")}</option>
                <option value="OTHER">{t("أخرى", "Other")}</option>
              </select>
              {errors.type && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div className="flex flex-col">
              <label
                htmlFor="category-name-ar"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                {t(" الفئة بالعربية", "Arabic name")}
              </label>
              <input
                id="category-name-ar"
                {...register("nameAr", {
                  required: t("الاسم العربي مطلوب", "Arabic name is required"),
                })}
                type="text"
                placeholder={t("أدخل الاسم العربي", "Enter Arabic name")}
                className={`mt-1 p-2 border rounded-md bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring focus:ring-blue-300 ${
                  errors.nameAr
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
              {errors.nameAr && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.nameAr.message}
                </p>
              )}
            </div>

            <div className="flex flex-col">
              <label
                htmlFor="category-name-en"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                {t("الاسم الانكليزي", "English name")}
              </label>
              <input
                id="category-name-en"
                {...register("nameEn", {
                  required: t(
                    "الاسم الإنكليزي مطلوب",
                    "English name is required",
                  ),
                })}
                type="text"
                placeholder={t("أدخل الاسم الإنكليزي", "Enter English name")}
                className={`mt-1 p-2 border rounded-md bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring focus:ring-blue-300 ${
                  errors.nameEn
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
              {errors.nameEn && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.nameEn.message}
                </p>
              )}
            </div>

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
      ) : (
        <div className="space-y-4">
          {loadingCategories ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("جارِ تحميل الفئات...", "Loading categories...")}
            </p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("لا توجد فئات حالياً", "No categories yet")}
            </p>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
                      <DynamicIcon
                        iconName={category.icon ?? "FaTag"}
                        size={18}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {isArabic
                          ? category.nameAr || category.nameEn || category.name
                          : category.nameEn || category.name || category.nameAr}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {category.type}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => startEdit(category)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-500 transition"
                  >
                    <FaRegEdit size={14} />
                    {t("تعديل", "Edit")}
                  </button>
                </div>
              ))}
            </div>
          )}

          {editingCategory ? (
            <form
              onSubmit={handleSubmitEdit(onSubmitEdit)}
              className="rounded-xl border border-blue-300 dark:border-blue-700 p-4 mt-4 space-y-4"
            >
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t("تعديل الفئة", "Edit category")}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("الفئة بالعربية", "Category name in Arabic")}
                  </label>
                  <input
                    {...registerEdit("nameAr", {
                      required: t(
                        "الاسم العربي مطلوب",
                        "Arabic name is required",
                      ),
                    })}
                    type="text"
                    className={`mt-1 p-2 border rounded-md bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring focus:ring-blue-300 ${
                      editErrors.nameAr
                        ? "border-red-500"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("الفئة بالإنكليزية", "English name")}
                  </label>
                  <input
                    {...registerEdit("nameEn", {
                      required: t(
                        "الاسم الإنكليزي مطلوب",
                        "English name is required",
                      ),
                    })}
                    type="text"
                    className={`mt-1 p-2 border rounded-md bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring focus:ring-blue-300 ${
                      editErrors.nameEn
                        ? "border-red-500"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("نوع الفئة", "Category Type")}
                  </label>
                  <select
                    {...registerEdit("type", {
                      required: t(
                        "نوع الفئة مطلوب",
                        "Category type is required",
                      ),
                    })}
                    className="mt-1 p-2 border rounded-md bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700"
                  >
                    <option value="NEW_CAR">
                      {t("سيارة (جديدة ومستعملة)", "Cars (new & used)")}
                    </option>
                    <option value="PROPERTY">{t("عقار", "Real estate")}</option>
                    <option value="OTHER">{t("أخرى", "Other")}</option>
                  </select>
                </div>

                <div className="flex flex-col md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("الأيقونة", "Icon")}
                  </label>
                  <IconPicker register={registerEdit} setValue={setEditValue} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 transition"
                >
                  {isUpdating
                    ? t("جارِ الحفظ...", "Saving...")
                    : t("حفظ التعديل", "Save changes")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    resetEdit();
                  }}
                  className="py-2 px-4 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                >
                  {t("إلغاء", "Cancel")}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      )}
    </div>
  );
}
