"use client";

import { memo } from "react";
import { MdLanguage } from "react-icons/md";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const LanguageToggle = () => {
  const { isArabic, toggleLocale } = useAppPreferences();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={isArabic ? "تبديل اللغة" : "Toggle language"}
      title={isArabic ? "التبديل إلى الإنجليزية" : "Switch to Arabic"}
      className="
        h-10 w-10 rounded-full border border-slate-200
        bg-white/90 text-slate-700 shadow-sm
        hover:bg-slate-100 transition-colors
        dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800
        flex items-center justify-center relative
      "
    >
      <MdLanguage size={20} />
      <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-700 text-white text-[9px] leading-none px-1 py-0.5 dark:bg-slate-200 dark:text-slate-900">
        {isArabic ? "EN" : "AR"}
      </span>
    </button>
  );
};

export default memo(LanguageToggle);
