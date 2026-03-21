"use client";

import React, { SetStateAction } from "react";
import { ActiveCode } from "./CodeCard";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
interface TabsProps {
  codes: ActiveCode[];
  setActiveTab: (value: SetStateAction<number | null>) => void;
  activeTab: number | null;
}

const Tabs = ({ codes, setActiveTab, activeTab }: TabsProps) => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const uniqueBalances = Array.from(new Set(codes.map((c) => c.balance))).sort(
    (a, b) => a - b,
  );
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-8">
      {uniqueBalances.map((balance) => (
        <button
          key={`tab-${balance}`} // ✅ مفتاح فريد
          onClick={() => setActiveTab(balance)}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition
              ${
                activeTab === balance
                  ? "bg-sky-900 text-white border-sky-900"
                  : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              }`}
        >
          {balance} 💵
        </button>
      ))}
      {uniqueBalances.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {t("لا توجد فئات رصيد", "No balance categories")}
        </p>
      )}
    </div>
  );
};

export default Tabs;
