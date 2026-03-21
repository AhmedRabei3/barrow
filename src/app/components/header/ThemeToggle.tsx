"use client";

import { memo } from "react";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const ThemeToggle = () => {
  const { theme, toggleTheme, isArabic } = useAppPreferences();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isArabic ? "تبديل الثيم" : "Toggle theme"}
      className="
        h-10 w-10 rounded-full border border-slate-200
        bg-white/90 text-slate-700 shadow-sm
        hover:bg-slate-100 transition-colors
        dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800
        flex items-center justify-center
      "
    >
      {isDark ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
    </button>
  );
};

export default memo(ThemeToggle);
