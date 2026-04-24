"use client";
import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import Input from "../../inputs/Input";
import PasswordHintsPanel from "../../inputs/PasswordHintsPanel";
import {
  DEFAULT_USER_INTEREST_ORDER,
  type UserInterestKey,
} from "@/lib/primaryCategories";

const INTEREST_LABELS: Record<UserInterestKey, { ar: string; en: string }> = {
  PROPERTY: { ar: "العقارات", en: "Real estate" },
  CARS: { ar: "السيارات", en: "Cars" },
  HOME_FURNITURE: { ar: "الأثاث المنزلي", en: "Home furniture" },
  MEDICAL_DEVICES: { ar: "الأجهزة الطبية", en: "Medical devices" },
  OTHER: { ar: "أشياء أخرى", en: "Other things" },
};

interface RegisterCalssicProps {
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
  isArabic: boolean;
  isLoading: boolean;
  passwordValue: string;
  interestOrder: UserInterestKey[];
  onMoveInterest: (index: number, direction: "up" | "down") => void;
}

const RegisterCalssic = ({
  register,
  errors,
  isArabic,
  isLoading,
  passwordValue,
  interestOrder,
  onMoveInterest,
}: RegisterCalssicProps) => {
  return (
    <>
      <Input
        id="name"
        label={isArabic ? "الاسم" : "Name"}
        disabled={isLoading}
        register={register}
        errors={errors}
        required
        iconName="FaRegUser"
        inputDir={isArabic ? "rtl" : "ltr"}
        textAlign={isArabic ? "right" : "left"}
      />
      <Input
        id="email"
        label={isArabic ? "البريد الإلكتروني" : "Email"}
        disabled={isLoading}
        register={register}
        errors={errors}
        required
        type="email"
        iconName="MdOutlineAlternateEmail"
        inputDir="ltr"
        textAlign="left"
      />
      <Input
        id="password"
        label={isArabic ? "كلمة المرور" : "Password"}
        type="password"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
        iconName="MdOutlineLock"
        inputDir="ltr"
        textAlign="left"
        allowPasswordToggle
      />

      <Input
        id="confirmPassword"
        label={isArabic ? "تأكيد كلمة المرور" : "Confirm password"}
        type="password"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
        iconName="MdOutlineVerifiedUser"
        inputDir="ltr"
        textAlign="left"
        allowPasswordToggle
        registerOptions={{
          validate: (value, formValues) =>
            value === formValues.password ||
            (isArabic
              ? "تأكيد كلمة المرور غير مطابق"
              : "Passwords do not match"),
        }}
      />

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50/70 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isArabic ? "أمان الحساب" : "Account security"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isArabic
                ? "اختر كلمة مرور قوية ثم أكّدها مباشرة قبل متابعة التسجيل."
                : "Choose a strong password, then confirm it before continuing registration."}
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
            {isArabic ? "مهم" : "Important"}
          </span>
        </div>

        <PasswordHintsPanel value={passwordValue} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {isArabic ? "رتّب اهتماماتك" : "Order your interests"}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isArabic
              ? "ستظهر لك الفئات الأقرب لاهتماماتك أولاً في الصفحة الرئيسية."
              : "Your homepage will prioritize the categories closest to your interests."}
          </p>
        </div>

        <div className="space-y-2">
          {(interestOrder.length
            ? interestOrder
            : DEFAULT_USER_INTEREST_ORDER
          ).map((interest, index, array) => (
            <div
              key={interest}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {isArabic
                    ? INTEREST_LABELS[interest].ar
                    : INTEREST_LABELS[interest].en}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isLoading || index === 0}
                  onClick={() => onMoveInterest(index, "up")}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                >
                  {isArabic ? "أعلى" : "Up"}
                </button>
                <button
                  type="button"
                  disabled={isLoading || index === array.length - 1}
                  onClick={() => onMoveInterest(index, "down")}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                >
                  {isArabic ? "أسفل" : "Down"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default RegisterCalssic;
