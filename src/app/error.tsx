"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isArabic, setIsArabic] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("barrow-locale");
      if (stored) setIsArabic(stored === "ar");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col items-center justify-center px-6 bg-white dark:bg-slate-950"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-150 w-150 rounded-full bg-rose-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-100 w-100 rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center gap-6 max-w-md">
        <p className="text-[96px] sm:text-[120px] font-extrabold leading-none select-none bg-linear-to-br from-rose-400 to-orange-500 bg-clip-text text-transparent">
          500
        </p>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {isArabic ? "حدث خطأ غير متوقع" : "Something went wrong"}
        </h1>

        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
          {isArabic
            ? "نعتذر، حدث خطأ في الخادم. يمكنك المحاولة مجدداً أو العودة للرئيسية."
            : "An unexpected error occurred. You can try again or return to the home page."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 transition-all px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/25"
          >
            {isArabic ? "حاول مجدداً" : "Try Again"}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {isArabic ? "الرئيسية" : "Go Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
