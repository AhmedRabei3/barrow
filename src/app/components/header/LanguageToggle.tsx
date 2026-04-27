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
        h-11 w-11 rounded-full border border-slate-300
        bg-white text-slate-800 shadow-sm
        hover:bg-slate-100 transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60
        dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800
        flex items-center justify-center relative
      "
    >
      <MdLanguage size={20} />
      <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-900 text-white text-[10px] font-semibold leading-none px-1.5 py-0.5 dark:bg-slate-100 dark:text-slate-950">
        {isArabic ? "EN" : "AR"}
      </span>
    </button>
  );
};

export default memo(LanguageToggle);
