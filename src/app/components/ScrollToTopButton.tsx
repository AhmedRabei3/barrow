"use client";

import { useEffect, useState } from "react";
import { FiChevronUp } from "react-icons/fi";
import { useAppPreferences } from "./providers/AppPreferencesProvider";

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);
  const { isArabic } = useAppPreferences();

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 360);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={isArabic ? "الانتقال إلى أعلى الصفحة" : "Scroll to top"}
      title={isArabic ? "إلى الأعلى" : "Back to top"}
      className="fixed bottom-6 left-6 z-40 h-11 w-11 rounded-full bg-white/72 dark:bg-slate-900/72 text-slate-700 dark:text-slate-100 border border-white/70 dark:border-slate-700/70 backdrop-blur-md shadow-md hover:shadow-lg hover:bg-white/85 dark:hover:bg-slate-900/85 transition-all duration-300"
    >
      <span className="flex items-center justify-center">
        <FiChevronUp size={20} />
      </span>
    </button>
  );
};

export default ScrollToTopButton;
