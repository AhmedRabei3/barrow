"use client";

import React from "react";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const ConfirmModal = ({
  title,
  description,
  onConfirm,
  onCancel,
  loading = false,
}: {
  title?: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const resolvedTitle = title || t("تأكيد", "Confirmation");
  const resolvedDescription =
    description || t("هل أنت متأكد؟", "Are you sure?");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="bg-white dark:bg-gray-800 rounded-md p-4 z-10 w-11/12 max-w-md">
        <h3 className="font-semibold mb-2 dark:text-slate-400">
          {resolvedTitle}
        </h3>
        <p className="text-sm text-gray-600 mb-4 dark:text-slate-400">
          {resolvedDescription}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors"
            disabled={loading}
          >
            {t("إلغاء", "Cancel")}
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-disabled={loading}
          >
            {loading ? <p className="spinner w-8"></p> : t("حذف", "Delete")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
