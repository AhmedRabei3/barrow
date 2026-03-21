"use client";

import { useAppPreferences } from "../providers/AppPreferencesProvider";

export interface ActiveCode {
  code: string;
  balance: number;
  createdAt: Date;
}

interface CodeCardProps {
  code: ActiveCode;
}

const CodeCard = ({ code }: CodeCardProps) => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md bg-white dark:bg-slate-900 transition duration-300">
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
