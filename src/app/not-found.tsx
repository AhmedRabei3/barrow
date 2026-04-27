"use client";

import Link from "next/link";
import { useAppPreferences } from "./components/providers/AppPreferencesProvider";

export default function NotFound() {
  const { isArabic } = useAppPreferences();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white dark:bg-slate-950">
      {/* Decorative blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-150 w-150 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-100 w-100 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center gap-6 max-w-md">
        {/* 404 number */}
        <p className="text-[96px] sm:text-[120px] font-extrabold leading-none select-none bg-linear-to-br from-sky-400 to-violet-500 bg-clip-text text-transparent">
          404
        </p>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {isArabic ? "الصفحة غير موجودة" : "Page Not Found"}
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
          {isArabic
            ? "يبدو أن هذه الصفحة لا توجد أو تم نقلها. تحقق من الرابط أو عد إلى الرئيسية."
            : "This page doesn't exist or has been moved. Check the URL or head back home."}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 active:scale-95 transition-all px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25"
          >
            {isArabic ? "← الرئيسية" : "← Go Home"}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {isArabic ? "رجوع" : "Go Back"}
          </button>
        </div>
      </div>
    </div>
  );
}
