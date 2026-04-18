"use client";

import Link from "next/link";
import { privacyPolicyContent } from "@/app/legal/privacyPolicyContent";

interface PolicyDialogProps {
  handlePolicyAccept: () => void;
  handlePolicyCancel: () => void;
  isArabic: boolean;
}

const PolicyDialog = ({
  handlePolicyAccept,
  handlePolicyCancel,
  isArabic,
}: PolicyDialogProps) => {
  const policyContent = isArabic
    ? privacyPolicyContent.ar
    : privacyPolicyContent.en;
  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-slate-950/60 px-3 py-4 sm:px-6">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 dark:border-slate-700">
          <p className="text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-100">
            {policyContent.pageTitle}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
            {policyContent.pageDescription}
          </p>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-sm leading-7 text-slate-700 sm:text-base dark:text-slate-200">
            {policyContent.intro}
          </p>
          <div className="mt-4 space-y-4">
            {policyContent.sections.map((section) => (
              <section
                key={section.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {section.title}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
          <Link
            href="/privacy-policy"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex text-sm font-semibold text-sky-700 transition hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
          >
            {policyContent.openPolicyLabel}
          </Link>
        </div>

        <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-700 sm:px-6 sm:py-5">
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
            {policyContent.agreementLabel}
          </p>
          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handlePolicyCancel}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isArabic ? "إلغاء الأمر" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handlePolicyAccept}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-5 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              {isArabic ? "موافق" : "Agree"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyDialog;
