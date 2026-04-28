"use client";

import IconPicker from "@/app/components/addCategory/IconPicker";
import categoryFetcher, {
  clearCategoriesCache,
} from "@/app/components/category/CategoryFetcher";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  addNewCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/actions/category.actions";
import toast from "react-hot-toast";
import { $Enums } from "@prisma/client";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { useEffect, useMemo, useState } from "react";
import { DynamicIcon } from "./IconSetter";
import { FaRegEdit, FaTrashAlt } from "react-icons/fa";
import {
  DELETE_ANIMATION_MS,
  dispatchInventoryInvalidated,
  playDeleteFeedback,
} from "@/app/utils/deleteFeedback";

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

const CATEGORY_TYPE_OPTIONS: Array<{
  value: $Enums.ItemType;
  label: { ar: string; en: string };
}> = [
  { value: "NEW_CAR", label: { ar: "سيارات جديدة", en: "New cars" } },
  {
    value: "USED_CAR",
    label: { ar: "سيارات مستعملة", en: "Used cars" },
  },
  { value: "PROPERTY", label: { ar: "عقارات", en: "Real estate" } },
  {
    value: "HOME_FURNITURE",
    label: { ar: "أثاث منزلي", en: "Home furniture" },
  },
  {
    value: "MEDICAL_DEVICE",
    label: { ar: "أجهزة طبية", en: "Medical devices" },
  },
  { value: "OTHER", label: { ar: "منوعات", en: "Other items" } },
];

export default function AddCategoryForm() {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [activeTab, setActiveTab] = useState<ActiveTab>("add");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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

  const visibleCategories = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) {
      return categories;
    }

    return categories.filter((category) => {
      const searchableText = [category.name, category.nameAr, category.nameEn]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(needle);
    });
  }, [categories, searchTerm]);

  const groupedCategories = useMemo(
    () =>
      CATEGORY_TYPE_OPTIONS.map((option) => ({
        ...option,
        items: visibleCategories.filter(
          (category) => category.type === option.value,
        ),
      })).filter((group) => group.items.length > 0),
    [visibleCategories],
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

  useEffect(() => {
    if (activeTab !== "existing") {
      setSearchTerm("");
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

  const handleDeleteCategory = async (category: CategoryRow) => {
    const confirmed = window.confirm(
      t(
        "تأكيد حذف هذه الفئة؟ لن تظهر بعد الآن في القوائم.",
        "Confirm deleting this category? It will no longer appear in category lists.",
      ),
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(category.id);
      const formData = new FormData();
      formData.append("id", category.id);

      const result = await deleteCategoryAction(formData);

      if (!result.success) {
        throw new Error(result.message || t("فشلت العملية", "Action failed"));
      }

      clearCategoriesCache();
      toast.success(result.message || t("تم حذف الفئة", "Category deleted"));
      playDeleteFeedback();
      dispatchInventoryInvalidated();
      setRemovingIds((current) =>
        current.includes(category.id) ? current : [...current, category.id],
      );
      if (editingId === category.id) {
        setEditingId(null);
        resetEdit();
      }
      window.setTimeout(() => {
        setCategories((current) =>
          current.filter((entry) => entry.id !== category.id),
        );
        setRemovingIds((current) =>
          current.filter((entryId) => entryId !== category.id),
        );
      }, DELETE_ANIMATION_MS);
      void loadCategories();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("فشل حذف الفئة", "Failed to delete category"),
      );
    } finally {
      setDeletingId(null);
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
                <option value="NEW_CAR">{t("سيارة جديدة", "New car")}</option>
                <option value="USED_CAR">
                  {t("سيارة مستعملة", "Used car")}
                </option>
                <option value="PROPERTY">{t("عقار", "Real estate")}</option>
                <option value="HOME_FURNITURE">
                  {t("أثاث منزلي", "Home furniture")}
                </option>
                <option value="MEDICAL_DEVICE">
                  {t("أجهزة طبية", "Medical devices")}
                </option>
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
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {t(
                    "فرز الفئات حسب النوع الرئيسي",
                    "Browse categories by main type",
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t(
                    "ابحث بالاسم العربي أو الإنكليزي، وستبقى النتائج مرتبة ضمن مجموعاتها.",
                    "Search by Arabic or English name while keeping results grouped by their parent type.",
                  )}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                {visibleCategories.length}{" "}
                {t("فئة ظاهرة", "visible categories")}
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="search"
                name="categorySearch"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t(
                  "ابحث باسم الفئة...",
                  "Search by category name...",
                )}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-900/50"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                >
                  {t("مسح", "Clear")}
                </button>
              ) : null}
            </div>
          </div>

          {loadingCategories ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("جارِ تحميل الفئات...", "Loading categories...")}
            </p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("لا توجد فئات حالياً", "No categories yet")}
            </p>
          ) : groupedCategories.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t(
                "لا توجد نتائج مطابقة لبحثك الحالي",
                "No categories match your current search",
              )}
            </p>
          ) : (
            <div className="space-y-5">
              {groupedCategories.map((group) => (
                <section
                  key={group.value}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/40">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {isArabic ? group.label.ar : group.label.en}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {group.value}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                      {group.items.length} {t("فئة", "categories")}
                    </span>
                  </div>

                  <div className="space-y-3 p-3">
                    {group.items.map((category) => (
                      <div
                        key={category.id}
                        className={`rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3 transition-all duration-200 ${
                          removingIds.includes(category.id)
                            ? "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"
                            : "opacity-100"
                        }`}
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
                                ? category.nameAr ||
                                  category.nameEn ||
                                  category.name
                                : category.nameEn ||
                                  category.name ||
                                  category.nameAr}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {category.type}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-500 transition"
                          >
                            <FaRegEdit size={14} />
                            {t("تعديل", "Edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(category)}
                            disabled={deletingId === category.id}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FaTrashAlt size={14} />
                            {deletingId === category.id
                              ? t("جارِ الحذف...", "Deleting...")
                              : t("حذف", "Delete")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
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
                      {t("سيارة جديدة", "New car")}
                    </option>
                    <option value="USED_CAR">
                      {t("سيارة مستعملة", "Used car")}
                    </option>
                    <option value="PROPERTY">{t("عقار", "Real estate")}</option>
                    <option value="HOME_FURNITURE">
                      {t("أثاث منزلي", "Home furniture")}
                    </option>
                    <option value="MEDICAL_DEVICE">
                      {t("أجهزة طبية", "Medical devices")}
                    </option>
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
