"use client";

import toast from "react-hot-toast";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

export interface ActiveCode {
  code: string;
  balance: number;
  used?: boolean;
  createdAt?: string;
}

interface CodeCardProps {
  code: ActiveCode;
}

const CodeCard = ({ code }: CodeCardProps) => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.code);
      toast.success(t("تم نسخ الكود", "Code copied"));
    } catch {
      toast.error(t("فشل نسخ الكود", "Failed to copy code"));
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md bg-white dark:bg-slate-900 transition duration-300">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            code.used
              ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
          }`}
        >
          {code.used ? t("مستخدم", "Used") : t("جاهز", "Ready")}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {t("نسخ", "Copy")}
        </button>
      </div>

      <p className="font-mono text-sm break-all text-slate-900 dark:text-slate-100">
        <span className="text-slate-600 dark:text-slate-400 font-semibold">
          {t("الكود", "Code")}:
        </span>{" "}
        {code.code}
      </p>
      <p className="text-slate-700 dark:text-slate-300 text-sm mt-2">
        <span className="font-semibold text-slate-600 dark:text-slate-400">
          {t("الرصيد", "Balance")}:
        </span>{" "}
        <span className="text-blue-600 dark:text-blue-400 font-bold">
          {code.balance}
        </span>
      </p>
      {code.createdAt && (
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">
          {t("تاريخ الإنشاء", "Created")}:{" "}
          {new Date(code.createdAt).toLocaleString(isArabic ? "ar" : "en-US")}
        </p>
      )}
    </div>
  );
};

export default CodeCard;
