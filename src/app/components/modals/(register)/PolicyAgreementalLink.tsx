"use client";

import { privacyPolicyContent } from "@/app/legal/privacyPolicyContent";
import {
  FieldErrors,
  UseFormClearErrors,
  UseFormRegister,
} from "react-hook-form";
import { FieldValues } from "react-hook-form";

interface PolicyAgreementalLinkProps {
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
  setIsPolicyDialogOpen: (open: boolean) => void;
  isArabic: boolean;
  clearErrors: UseFormClearErrors<FieldValues>;
}

const PolicyAgreementalLink = ({
  register,
  errors,
  setIsPolicyDialogOpen,
  isArabic,
  clearErrors,
}: PolicyAgreementalLinkProps) => {
  const policyContent = isArabic
    ? privacyPolicyContent.ar
    : privacyPolicyContent.en;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          {...register("acceptPrivacyPolicy", {
            required: policyContent.agreementError,
            onChange: (event) => {
              const checked = Boolean(event.target.checked);
              if (checked) {
                clearErrors("acceptPrivacyPolicy");
              }
            },
          })}
        />
        <span className="leading-7 text-slate-600 dark:text-slate-300">
          {isArabic ? "أوافق على " : "I agree to the "}
          <button
            type="button"
            onClick={() => setIsPolicyDialogOpen(true)}
            className="font-semibold text-sky-700 underline underline-offset-4 transition hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
          >
            {isArabic
              ? "شروط الاستخدام وسياسة الخصوصية"
              : "Terms of Use and Privacy Policy"}
          </button>
        </span>
      </label>

      {errors.acceptPrivacyPolicy ? (
        <p className="mt-2 text-sm text-rose-500">
          {String(
            errors.acceptPrivacyPolicy.message || policyContent.agreementError,
          )}
        </p>
      ) : null}
    </div>
  );
};

export default PolicyAgreementalLink;
