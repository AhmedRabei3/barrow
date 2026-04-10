"use client";

import { useCallback, useEffect, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import Modal from "./Modal";
import Heading from "../Heading";
import Input from "../inputs/Input";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { loginAction } from "@/actions/auth.actions";
import { signIn } from "next-auth/react";
import { LoginUserInput } from "@/app/validations/userValidations";
import { useSession } from "next-auth/react";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { localizeErrorMessage } from "@/app/i18n/errorMessages";

const LoginModal = () => {
  const router = useRouter();
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);
  const [activationMessage, setActivationMessage] = useState<string | null>(
    null,
  );
  const { update, status } = useSession();
  const { isArabic } = useAppPreferences();

  useEffect(() => {
    if (status === "authenticated" && loginModal.isOpen) {
      loginModal.onClose();
    }
  }, [status, loginModal]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      setIsLoading(true);
      const result = await loginAction(data as LoginUserInput, isArabic);

      if (result.success) {
        const { email, password } = data;
        const authResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (authResult?.error) {
          toast.error(
            isArabic ? "بيانات الاعتماد غير صحيحة" : "Invalid credentials",
          );
          return;
        }

        // تحقق من وجود pendingEmailToken في localStorage
        const pendingToken =
          typeof window !== "undefined"
            ? localStorage.getItem("pendingEmailToken")
            : null;
        if (pendingToken) {
          try {
            const res = await fetch("/api/verify-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: pendingToken }),
            });
            const result = await res.json();
            if (result.success) {
              setActivationMessage(
                isArabic
                  ? "تم تفعيل البريد الإلكتروني بنجاح!"
                  : "Email verified successfully!",
              );
            } else {
              setActivationMessage(
                result.message ||
                  (isArabic
                    ? "فشل تفعيل البريد الإلكتروني."
                    : "Email verification failed."),
              );
            }
          } catch (e) {
            console.error("Error during email verification:", e);
            setActivationMessage(
              isArabic
                ? "حدث خطأ أثناء تفعيل البريد الإلكتروني."
                : "An error occurred during email verification.",
            );
          }
          localStorage.removeItem("pendingEmailToken");
        }

        toast.success(
          isArabic ? "تم تسجيل الدخول بنجاح" : "Logged in successfully",
        );
        update();
        router.replace("/");
        loginModal.onClose();
      } else {
        toast.error(
          isArabic
            ? localizeErrorMessage(result.message, true)
            : result.message,
        );
      }
    } catch (error) {
      console.log(error);
      toast.error(isArabic ? "حدث خطأ غير متوقع" : "Unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = useCallback(() => {
    loginModal.onClose();
    registerModal.onOpen();
  }, [loginModal, registerModal]);

  const bodyContent = (
    <div className="flex flex-col gap-2">
      <Heading
        title={isArabic ? "مرحبًا بعودتك" : "Welcome back"}
        subtitle={isArabic ? "سجّل الدخول إلى حسابك" : "Login to your account"}
      />
      <Input
        id="email"
        label={isArabic ? "البريد الإلكتروني" : "Email"}
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      <Input
        id="password"
        label={isArabic ? "كلمة المرور" : "Password"}
        type="password"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
    </div>
  );

  const footerContent = (
    <div className="flex flex-col gap-2 mt-3">
      <hr />
      <div
        className="
         text-slate-600 dark:text-slate-300
          text-center 
          mt-1 
          font-light
        "
      >
        <div className="justify-center flex flex-row items-center gap-2">
          {isArabic ? "ليس لديك حساب؟" : "Don’t have an account?"}{" "}
          <div
            onClick={toggle}
            className="hover:underline cursor-pointer text-sky-700 dark:text-sky-300"
          >
            {isArabic ? "إنشاء حساب" : "Register"}
          </div>
        </div>
      </div>
    </div>
  );

  if (status === "authenticated") {
    return null;
  }

  return (
    <>
      <Modal
        disabled={isLoading}
        isOpen={loginModal.isOpen}
        title={isArabic ? "تسجيل الدخول" : "Login"}
        actionLabel={isArabic ? "متابعة" : "Continue"}
        onClose={loginModal.onClose}
        onSubmit={handleSubmit(onSubmit)}
        body={bodyContent}
        footer={footerContent}
      />
      {activationMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white border border-emerald-300 rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-emerald-700 mb-2">
              {activationMessage}
            </h2>
            <button
              className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-md"
              onClick={() => setActivationMessage(null)}
            >
              {isArabic ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginModal;
