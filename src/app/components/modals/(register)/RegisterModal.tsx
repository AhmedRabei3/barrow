"use client";

import { useCallback, useEffect, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import Modal from "../Modal";
import Heading from "../../Heading";
import useLoginModal from "@/app/hooks/useLoginModal";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";
import { APP_NAME_AR, APP_NAME_EN } from "@/app/i18n/brand";
import { useSession } from "next-auth/react";
import GoogleSignInButton from "@/app/components/auth/GoogleSignInButton";
import EmailVerificationResendPanel from "@/app/components/auth/EmailVerificationResendPanel";
import PolicyDialog from "./PolicyDialog";
import PolicyAgreementalLink from "./PolicyAgreementalLink";
import RegisterCalssic from "./RegisterCalssic";
import RegisterModalFooter from "./RegisterModalFooter";
import registerFunc from "./registerSubmit";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  requestExistingUserPasswordResetAction,
  resendVerificationEmailAction,
} from "@/actions/auth.actions";
import {
  DEFAULT_USER_INTEREST_ORDER,
  normalizeUserInterestOrder,
  PENDING_INTEREST_ORDER_STORAGE_KEY,
  type UserInterestKey,
} from "@/lib/primaryCategories";

const REFERRAL_STORAGE_KEY = "pending-referrer-id";
const PENDING_VERIFICATION_EMAIL_KEY = "pending-verification-email";

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

const readPendingVerificationEmail = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const persistPendingVerificationEmail = (value?: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (value && value.trim().length > 0) {
    window.localStorage.setItem(
      PENDING_VERIFICATION_EMAIL_KEY,
      value.trim().toLowerCase(),
    );
    return;
  }

  window.localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
};

const persistPendingInterestOrder = (interestOrder: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PENDING_INTEREST_ORDER_STORAGE_KEY,
    JSON.stringify(interestOrder),
  );
};

const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);
  const [isClassicOpen, setIsClassicOpen] = useState(false);
  const [existingUserEmail, setExistingUserEmail] = useState<string | null>(
    null,
  );
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null);
  const [resetInfoMessage, setResetInfoMessage] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const { isArabic } = useAppPreferences();
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && registerModal.isOpen) {
      registerModal.onClose();
    }
  }, [status, registerModal]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    clearErrors,
    setError,
    getValues,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      interestOrder: DEFAULT_USER_INTEREST_ORDER,
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
      const storedPendingVerificationEmail = readPendingVerificationEmail();
      setIsPolicyDialogOpen(false);
      setIsClassicOpen(true);
      setExistingUserEmail(null);
      setPendingVerificationEmail(storedPendingVerificationEmail);
      setResetInfoMessage(null);
      reset({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        interestOrder: DEFAULT_USER_INTEREST_ORDER,
        acceptPrivacyPolicy: false,
        referredBy: resolvedReferrer,
      });
      return;
    }

    setValue("referredBy", resolvedReferrer);
  }, [registerModal.isOpen, registerModal.referredBy, reset, setValue]);

  useEffect(() => {
    persistPendingVerificationEmail(pendingVerificationEmail);
  }, [pendingVerificationEmail]);

  const handlePolicyAccept = useCallback(() => {
    setIsPolicyDialogOpen(false);
    setValue("acceptPrivacyPolicy", true, {
      shouldDirty: true,
      shouldValidate: true,
    });
    clearErrors("acceptPrivacyPolicy");
  }, [clearErrors, setValue]);

  const handlePolicyCancel = useCallback(() => {
    setIsPolicyDialogOpen(false);
  }, []);

  const ensurePolicyAccepted = useCallback(async () => {
    if (Boolean(getValues("acceptPrivacyPolicy"))) {
      clearErrors("acceptPrivacyPolicy");
      return true;
    }

    setError("acceptPrivacyPolicy", {
      type: "manual",
      message: isArabic
        ? "يجب الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة"
        : "You must accept the Terms of Use and Privacy Policy to continue",
    });
    toast.error(
      isArabic
        ? "وافق على الشروط أولاً للمتابعة"
        : "Accept the terms first to continue",
    );
    return false;
  }, [clearErrors, getValues, isArabic, setError]);

  const handleForgotPassword = useCallback(async () => {
    if (!existingUserEmail) {
      return;
    }

    try {
      setIsSendingReset(true);
      const result = await requestExistingUserPasswordResetAction(
        existingUserEmail,
        isArabic,
      );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setResetInfoMessage(result.message);
      toast.success(result.message);
    } catch {
      toast.error(
        isArabic
          ? "تعذر إرسال رسالة إعادة التعيين"
          : "Failed to send reset email",
      );
    } finally {
      setIsSendingReset(false);
    }
  }, [existingUserEmail, isArabic]);

  const handleExistingUserLogin = useCallback(() => {
    setExistingUserEmail(null);
    setResetInfoMessage(null);
    registerModal.onClose();
    loginModal.onOpen();
  }, [loginModal, registerModal]);

  const onSubmit = async (data: FieldValues) => {
    const accepted = await ensurePolicyAccepted();
    if (!accepted) {
      return;
    }

    if (!isClassicOpen) {
      setIsClassicOpen(true);
      setPendingVerificationEmail(null);
      toast(
        isArabic
          ? "افتح التسجيل بطريقة أخرى لإدخال بيانات الحساب"
          : "Open the other registration method to enter your account details",
      );
      return;
    }

    setResetInfoMessage(null);
    await registerFunc({
      data,
      setIsLoading,
      setExistingUserEmail,
      setPendingVerificationEmail,
      isArabic,
      isReferralId,
      persistReferrer,
      loginModal,
      registerModal,
      router,
    });
  };

  const toggle = useCallback(() => {
    loginModal.onOpen();
    registerModal.onClose();
  }, [loginModal, registerModal]);

  const passwordValue = String(watch("password") ?? "");
  const interestOrder = normalizeUserInterestOrder(
    Array.isArray(watch("interestOrder"))
      ? (watch("interestOrder") as string[])
      : DEFAULT_USER_INTEREST_ORDER,
  );

  const handleMoveInterest = useCallback(
    (index: number, direction: "up" | "down") => {
      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= interestOrder.length) {
        return;
      }

      const nextOrder = [...interestOrder] as UserInterestKey[];
      [nextOrder[index], nextOrder[nextIndex]] = [
        nextOrder[nextIndex],
        nextOrder[index],
      ];

      setValue("interestOrder", nextOrder, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [interestOrder, setValue],
  );

  const handleGoogleBeforeContinue = useCallback(async () => {
    const accepted = await ensurePolicyAccepted();

    if (!accepted) {
      return false;
    }

    persistPendingInterestOrder(interestOrder);
    return true;
  }, [ensurePolicyAccepted, interestOrder]);

  const bodyContent = (
    <>
      {isPolicyDialogOpen ? (
        <PolicyDialog
          handlePolicyAccept={handlePolicyAccept}
          handlePolicyCancel={handlePolicyCancel}
          isArabic={isArabic}
        />
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

        <GoogleSignInButton
          disabled={isLoading || isSendingReset}
          callbackUrl="/"
          showDivider={false}
          beforeContinue={handleGoogleBeforeContinue}
        />

        <button
          type="button"
          onClick={() => {
            setExistingUserEmail(null);
            setPendingVerificationEmail(null);
            setResetInfoMessage(null);
            setIsClassicOpen((value) => !value);
          }}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          aria-expanded={isClassicOpen}
        >
          <span>
            {isArabic ? "التسجيل بطريقة أخرى" : "Register another way"}
          </span>
          <span
            className={`text-lg transition ${isClassicOpen ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>

        {isClassicOpen ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <RegisterCalssic
              register={register}
              errors={errors}
              isArabic={isArabic}
              isLoading={isLoading}
              passwordValue={passwordValue}
              interestOrder={interestOrder}
              onMoveInterest={handleMoveInterest}
            />
          </div>
        ) : null}
        <PolicyAgreementalLink
          register={register}
          errors={errors}
          setIsPolicyDialogOpen={setIsPolicyDialogOpen}
          isArabic={isArabic}
          clearErrors={clearErrors}
        />
        {pendingVerificationEmail ? (
          <EmailVerificationResendPanel
            isArabic={isArabic}
            expectedEmail={pendingVerificationEmail}
            onResend={(email) => resendVerificationEmailAction(email, isArabic)}
          />
        ) : null}

        {existingUserEmail ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="font-semibold">
              {isArabic
                ? "هذا البريد مرتبط بحساب موجود بالفعل. هل تريد تسجيل الدخول أم نسيت كلمة المرور؟"
                : "This email already belongs to an existing account. Do you want to sign in or did you forget your password?"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExistingUserLogin}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                {isArabic ? "تسجيل الدخول" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isSendingReset}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {isSendingReset
                  ? isArabic
                    ? "جاري الإرسال..."
                    : "Sending..."
                  : isArabic
                    ? "نسيت كلمة المرور"
                    : "Forgot password"}
              </button>
            </div>
            {resetInfoMessage ? (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                {resetInfoMessage}
              </p>
            ) : null}
          </div>
        ) : null}

        <input type="hidden" {...register("referredBy")} />
      </div>
    </>
  );

  if (status === "authenticated") {
    return null;
  }

  const footerContent = (
    <RegisterModalFooter isArabic={isArabic} toggle={toggle} />
  );

  return (
    <Modal
      disabled={isLoading}
      isOpen={registerModal.isOpen}
      title={isArabic ? "إنشاء حساب" : "Register"}
      actionLabel={isArabic ? "إنشاء الحساب" : "Create account"}
      onClose={registerModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
};

export default RegisterModal;
