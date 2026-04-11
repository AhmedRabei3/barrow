"use client";

import Link from "next/link";
import { privacyPolicyContent } from "@/app/legal/privacyPolicyContent";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

export default function PrivacyPolicyPage() {
  const { isArabic } = useAppPreferences();
  const content = isArabic ? privacyPolicyContent.ar : privacyPolicyContent.en;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-8 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
            {isArabic ? "قسم قانوني" : "Legal"}
          </p>
          <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100 sm:text-4xl">
            {content.pageTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            {content.pageDescription}
          </p>
        </div>

        <div className="space-y-6 px-6 py-8 sm:px-8">
          <p className="text-sm leading-8 text-slate-700 dark:text-slate-200">
            {content.intro}
          </p>

          <div className="space-y-4">
            {content.sections.map((section) => (
              <section
                key={section.title}
                className="rounded-2xl border border-slate-200 px-5 py-4 dark:border-slate-800"
              >
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <div className="rounded-2xl bg-sky-50 px-5 py-4 text-sm leading-7 text-slate-700 dark:bg-sky-950/30 dark:text-slate-200">
            {content.agreementLabel}
          </div>

          <div>
            <Link
              href="/"
              className="inline-flex items-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-500"
            >
              {isArabic ? "العودة إلى الرئيسية" : "Back to home"}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
