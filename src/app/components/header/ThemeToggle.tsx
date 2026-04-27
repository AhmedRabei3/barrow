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
        h-11 w-11 rounded-full border border-slate-300
        bg-white text-slate-800 shadow-sm
        hover:bg-slate-100 transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60
        dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800
        flex items-center justify-center
      "
    >
      {isDark ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
    </button>
  );
};

export default memo(ThemeToggle);
