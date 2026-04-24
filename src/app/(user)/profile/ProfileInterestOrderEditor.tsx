"use client";

import { updatePreferredInterestOrderAction } from "@/actions/auth.actions";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import {
  DEFAULT_USER_INTEREST_ORDER,
  normalizeUserInterestOrder,
  type UserInterestKey,
} from "@/lib/primaryCategories";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const INTEREST_LABELS: Record<UserInterestKey, { ar: string; en: string }> = {
  PROPERTY: { ar: "العقارات", en: "Real estate" },
  CARS: { ar: "السيارات", en: "Cars" },
  HOME_FURNITURE: { ar: "الأثاث المنزلي", en: "Home furniture" },
  MEDICAL_DEVICES: { ar: "الأجهزة الطبية", en: "Medical devices" },
  OTHER: { ar: "أشياء أخرى", en: "Other things" },
};

const ProfileInterestOrderEditor = () => {
  const { isArabic } = useAppPreferences();
  const { data: session, update } = useSession();
  const currentOrder = useMemo(
    () =>
      normalizeUserInterestOrder(
        session?.user?.preferredInterestOrder ?? DEFAULT_USER_INTEREST_ORDER,
      ),
    [session?.user?.preferredInterestOrder],
  );
  const [interestOrder, setInterestOrder] =
    useState<UserInterestKey[]>(currentOrder);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setInterestOrder(currentOrder);
  }, [currentOrder]);

  const isDirty = useMemo(
    () => currentOrder.join("|") !== interestOrder.join("|"),
    [currentOrder, interestOrder],
  );

  const moveInterest = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;

    if (nextIndex < 0 || nextIndex >= interestOrder.length) {
      return;
    }

    setInterestOrder((current) => {
      const nextOrder = [...current];
      [nextOrder[index], nextOrder[nextIndex]] = [
        nextOrder[nextIndex],
        nextOrder[index],
      ];
      return nextOrder;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const result = await updatePreferredInterestOrderAction(
        interestOrder,
        isArabic,
      );

      if (!result.success) {
        toast.error(
          result.message ||
            (isArabic ? "تعذر حفظ الترتيب" : "Could not save interest order"),
        );
        return;
      }

      await update();
      toast.success(
        isArabic
          ? "تم حفظ ترتيب الاهتمامات"
          : "Interest order saved successfully",
      );
    } catch {
      toast.error(
        isArabic ? "تعذر حفظ الترتيب" : "Could not save interest order",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setInterestOrder(DEFAULT_USER_INTEREST_ORDER);
  };

  return (
    <section className="rounded-none border-y border-slate-200 bg-white px-4 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-xl sm:border sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isArabic ? "ترتيب اهتماماتك" : "Your interests order"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {isArabic
              ? "غيّر ترتيب الفئات لتظهر الأقرب لاهتماماتك أولاً في الصفحة الرئيسية."
              : "Reorder categories so the homepage shows the ones you care about first."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
        >
          {isArabic ? "إعادة الترتيب الافتراضي" : "Reset default order"}
        </button>
      </div>

      <div className="mt-5 space-y-2">
        {interestOrder.map((interest, index, array) => (
          <div
            key={interest}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
                {index + 1}
              </span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {isArabic
                  ? INTEREST_LABELS[interest].ar
                  : INTEREST_LABELS[interest].en}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveInterest(index, "up")}
                disabled={isSaving || index === 0}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                {isArabic ? "أعلى" : "Up"}
              </button>
              <button
                type="button"
                onClick={() => moveInterest(index, "down")}
                disabled={isSaving || index === array.length - 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                {isArabic ? "أسفل" : "Down"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? isArabic
              ? "جاري الحفظ..."
              : "Saving..."
            : isArabic
              ? "حفظ الترتيب"
              : "Save order"}
        </button>
      </div>
    </section>
  );
};

export default ProfileInterestOrderEditor;
