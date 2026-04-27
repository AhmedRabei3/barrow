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
      className="fixed bottom-6 left-6 z-40 h-12 w-12 rounded-full border border-slate-300 bg-white/92 text-slate-900 backdrop-blur-md shadow-md transition-all duration-300 hover:bg-white hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 dark:border-slate-600 dark:bg-slate-900/92 dark:text-slate-100 dark:hover:bg-slate-900"
    >
      <span className="flex items-center justify-center">
        <FiChevronUp size={20} />
      </span>
    </button>
  );
};

export default ScrollToTopButton;
