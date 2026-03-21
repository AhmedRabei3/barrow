"use client";

import { useCallback, useEffect, useState } from "react";
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
import { isCuid } from "@paralleldrive/cuid2";

const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isArabic } = useAppPreferences();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && registerModal.isOpen) {
      registerModal.onClose();
    }
  }, [status, registerModal]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      referredBy: registerModal.referredBy || undefined,
    },
  });

  useEffect(() => {
    setValue("referredBy", registerModal.referredBy || undefined);
  }, [registerModal.referredBy, setValue]);

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      setIsLoading(true);
      // تحقق من referredBy قبل الإرسال
      const cleanData = { ...data };
      if (cleanData.referredBy && !isCuid(cleanData.referredBy)) {
        delete cleanData.referredBy;
      }
      
      const result = await registerAction(
        cleanData as RegisterUserInput,
        isArabic,
      );
      if (result.success) {
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
      <input type="hidden" {...register("referredBy")} />
    </div>
  );

  const footerContent = (
    <div className="flex flex-col gap-2 mt-3 ">
      <hr />

      <div className="text-slate-600 dark:text-slate-300 text-center mt-1 font-light">
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
