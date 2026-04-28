"use client";

import React, { useEffect, useState } from "react";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const EditItemModal = ({
  itemId,
  onClose,
  onSaved,
}: {
  itemId: string | null;
  onClose: () => void;
  onSaved?: (updated?: { id: string | null; title: string }) => void;
}) => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!itemId) return;
    // placeholder: fetch item details if needed
    // For now we only set a placeholder title
    setTitle("");
  }, [itemId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Implement actual save flow: PATCH /api/items/:id
      await new Promise((r) => setTimeout(r, 600));
      if (onSaved) onSaved({ id: itemId, title });
      onClose();
    } catch (err) {
      console.error("Edit save error", err);
    } finally {
      setLoading(false);
    }
  };

  if (!itemId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white dark:bg-gray-800 rounded-md p-4 z-10 w-11/12 max-w-lg">
        <h3 className="font-semibold mb-2">{t("تعديل العنصر", "Edit item")}</h3>
        <div className="space-y-3">
          <label className="block text-sm">{t("العنوان", "Title")}</label>
          <input
            name="editItemTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border px-2 py-1"
            placeholder={t("عنوان جديد (مثال)", "New title (example)")}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100">
            {t("إلغاء", "Cancel")}
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 rounded bg-emerald-600 text-white"
            disabled={loading}
          >
            {loading ? t("جاري الحفظ...", "Saving...") : t("حفظ", "Save")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;
