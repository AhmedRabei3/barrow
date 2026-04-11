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
    <div
      className="
        flex 
        flex-col 
        gap-2
      "
    >
      <Heading
        title={
          isArabic ? `مرحبًا بك في ${APP_NAME_AR}` : `Welcome to ${APP_NAME_EN}`
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
          {policyContent.intro}
        </p>
        <div className="mt-3 max-h-48 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          {policyContent.sections.map((section) => (
            <div key={section.title}>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {section.title}
              </p>
              <p className="mt-1 leading-7 text-slate-600 dark:text-slate-300">
                {section.body}
              </p>
            </div>
          ))}
        </div>
        <label className="mt-4 flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            {...register("acceptPrivacyPolicy", {
              required: policyContent.agreementError,
            })}
          />
          <span className="leading-7">{policyContent.agreementLabel}</span>
        </label>
        {errors.acceptPrivacyPolicy ? (
          <p className="mt-2 text-sm text-rose-500">
            {String(
              errors.acceptPrivacyPolicy.message ||
                policyContent.agreementError,
            )}
          </p>
        ) : null}
        <Link
          href="/privacy-policy"
          className="mt-3 inline-flex text-sm font-semibold text-sky-700 transition hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
          onClick={() => registerModal.onClose()}
        >
          {policyContent.openPolicyLabel}
        </Link>
      </div>
      <input type="hidden" {...register("referredBy")} />
    </div>
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
