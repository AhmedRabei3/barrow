"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import Modal from "./Modal";
import Heading from "../Heading";
import Input from "../inputs/Input";
import toast from "react-hot-toast";
import useLoginModal from "@/app/hooks/useLoginModal";
import { registerAction } from "@/actions/auth.actions";
import { RegisterUserInput } from "@/app/validations/userValidations";
import { useRouter } from "next/navigation";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { APP_NAME_AR, APP_NAME_EN } from "@/app/i18n/brand";
import { useSession } from "next-auth/react";
import { privacyPolicyContent } from "@/app/legal/privacyPolicyContent";

const REFERRAL_STORAGE_KEY = "pending-referrer-id";

const isReferralId = (value: unknown): value is string =>
  typeof value === "string" && /^c[a-z0-9]{24,}$/i.test(value);

const readStoredReferrer = (): string | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const value = window.sessionStorage.getItem(REFERRAL_STORAGE_KEY);
  return isReferralId(value) ? value : undefined;
};

const persistReferrer = (value?: string) => {
  if (typeof window === "undefined") {
    return;
  }

  if (isReferralId(value)) {
    window.sessionStorage.setItem(REFERRAL_STORAGE_KEY, value);
    return;
  }

  window.sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
};

const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [hasAcceptedPolicy, setHasAcceptedPolicy] = useState(false);
  const router = useRouter();
  const { isArabic } = useAppPreferences();
  const { status } = useSession();
  const policyContent = isArabic
    ? privacyPolicyContent.ar
    : privacyPolicyContent.en;

  useEffect(() => {
    if (status === "authenticated" && registerModal.isOpen) {
      registerModal.onClose();
    }
  }, [status, registerModal]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptPrivacyPolicy: false,
      referredBy: registerModal.referredBy || undefined,
    },
  });

  useEffect(() => {
    const resolvedReferrer = isReferralId(registerModal.referredBy)
      ? registerModal.referredBy
      : readStoredReferrer();

    persistReferrer(resolvedReferrer);

    if (registerModal.isOpen) {
      setHasAcceptedPolicy(false);
      setIsPolicyDialogOpen(true);
      reset({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        acceptPrivacyPolicy: false,
        referredBy: resolvedReferrer,
      });
      return;
    }

    setValue("referredBy", resolvedReferrer);
  }, [registerModal.isOpen, registerModal.referredBy, reset, setValue]);

  const handlePolicyAccept = useCallback(() => {
    setHasAcceptedPolicy(true);
    setIsPolicyDialogOpen(false);
    setValue("acceptPrivacyPolicy", true, {
      shouldDirty: true,
      shouldValidate: true,
    });
    clearErrors("acceptPrivacyPolicy");
  }, [clearErrors, setValue]);

  const handlePolicyCancel = useCallback(() => {
    setIsPolicyDialogOpen(false);

    if (!hasAcceptedPolicy) {
      registerModal.onClose();
      return;
    }
  }, [hasAcceptedPolicy, registerModal]);

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      setIsLoading(true);

      const cleanData = { ...data };
      if (cleanData.password !== cleanData.confirmPassword) {
        toast.error(
          isArabic ? "تأكيد كلمة المرور غير مطابق" : "Passwords do not match",
        );
        return;
      }

      delete cleanData.confirmPassword;

      if (!isReferralId(cleanData.referredBy)) {
        delete cleanData.referredBy;
        persistReferrer(undefined);
      }

      const result = await registerAction(
        cleanData as RegisterUserInput,
        isArabic,
      );
      if (result.success) {
        persistReferrer(undefined);
        toast.success(result.message);
        registerModal.onClose();
        loginModal.onOpen();
      } else {
        toast.error(result.message);
      }
      router.refresh();
    } catch (error) {
      if (error) {
        return toast.error(isArabic ? "حدث خطأ ما" : "Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = useCallback(() => {
    loginModal.onOpen();
    registerModal.onClose();
  }, [loginModal, registerModal]);

  const bodyContent = (
    <>
      {isPolicyDialogOpen ? (
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
      ) : null}

      <div
        className={`flex flex-col gap-2 transition ${
          isPolicyDialogOpen
            ? "pointer-events-none select-none opacity-25 blur-[2px]"
            : ""
        }`}
      >
        <Heading
          title={
            isArabic
              ? `مرحبًا بك في ${APP_NAME_AR}`
              : `Welcome to ${APP_NAME_EN}`
          }
          subtitle={isArabic ? "أنشئ حسابًا جديدًا" : "Create an account"}
        />
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
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60">
          <p className="font-bold text-slate-900 dark:text-slate-100">
            {policyContent.pageTitle}
          </p>
          <p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">
            {hasAcceptedPolicy
              ? policyContent.agreementLabel
              : policyContent.agreementError}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* <button
              type="button"
              onClick={reopenPolicyDialog}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {hasAcceptedPolicy
                ? isArabic
                  ? "مراجعة الشروط والسياسة"
                  : "Review terms and policy"
                : isArabic
                  ? "قراءة الشروط والسياسة"
                  : "Read terms and policy"}
            </button> */}
            <span className="text-xs leading-6 text-slate-500 dark:text-slate-400 sm:text-sm">
              {hasAcceptedPolicy
                ? isArabic
                  ? "تم حفظ الموافقة ويمكنك متابعة التسجيل الآن."
                  : "Consent saved. You can finish registration now."
                : isArabic
                  ? "يجب الموافقة أولًا قبل إكمال إنشاء الحساب."
                  : "You must agree before continuing registration."}
            </span>
          </div>
          {errors.acceptPrivacyPolicy ? (
            <p className="mt-2 text-sm text-rose-500">
              {String(
                errors.acceptPrivacyPolicy.message ||
                  policyContent.agreementError,
              )}
            </p>
          ) : null}
        </div>
        <input
          type="checkbox"
          className="hidden"
          {...register("acceptPrivacyPolicy")}
        />
        <input type="hidden" {...register("referredBy")} />
      </div>
    </>
  );

  const footerContent = (
    <div className="flex flex-col gap-2 mt-3 ">
      <hr />

      <div className="text-slate-600 dark:text-slate-200 text-center mt-1 font-light">
        <div className="justify-center flex flex-row -items-center gap-2">
          {isArabic ? "لديك حساب بالفعل؟" : "Already have an account?"}{" "}
          <div
            onClick={toggle}
            className="hover:underline cursor-pointer text-sky-700 dark:text-sky-300"
          >
            {isArabic ? "تسجيل الدخول" : "Login"}
          </div>
        </div>
      </div>
    </div>
  );

  if (status === "authenticated") {
    return null;
  }

  return (
    <Modal
      disabled={isLoading}
      isOpen={registerModal.isOpen}
      title={isArabic ? "إنشاء حساب" : "Register"}
      actionLabel={isArabic ? "متابعة" : "Continue"}
      onClose={registerModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
};

export default RegisterModal;
