"use client";

import { SetStateAction } from "react";
import { SubmitHandler, FieldValues } from "react-hook-form";

import { RegisterUserInput } from "@/app/validations/userValidations";
import { registerAction } from "@/actions/auth.actions";
import toast from "react-hot-toast";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type RegisterModalStore = {
  onClose: () => void;
  onOpen: () => void;
  isOpen: boolean;
};
type LoginModalStore = {
  onClose: () => void;
  onOpen: () => void;
  isOpen: boolean;
};

interface Registerfunc {
  setIsLoading: (value: SetStateAction<boolean>) => void;
  setExistingUserEmail: (value: string | null) => void;
  setPendingVerificationEmail: (value: string | null) => void;
  isArabic: boolean;
  data: FieldValues;
  isReferralId: (value: unknown) => value is string;
  persistReferrer: (value?: string | undefined) => void;
  registerModal: RegisterModalStore;
  loginModal: LoginModalStore;
  router: AppRouterInstance;
}

export default async function registerFunc({
  setIsLoading,
  setExistingUserEmail,
  setPendingVerificationEmail,
  isArabic,
  data,
  isReferralId,
  persistReferrer,
  registerModal,
  loginModal,
  router,
}: Registerfunc) {
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

      if (!result.success && result.reason === "USER_UNVERIFIED") {
        setExistingUserEmail(null);
        setPendingVerificationEmail(
          typeof result.email === "string"
            ? result.email
            : String(cleanData.email ?? ""),
        );
        return;
      }

      if (!result.success && result.reason === "USER_EXISTS") {
        setPendingVerificationEmail(null);
        setExistingUserEmail(
          typeof result.email === "string"
            ? result.email
            : String(cleanData.email ?? ""),
        );
        return;
      }

      if (result.success) {
        setExistingUserEmail(null);
        setPendingVerificationEmail(null);
        persistReferrer(undefined);
        toast.success(result.message);
        registerModal.onClose();
        loginModal.onOpen();
      } else {
        setExistingUserEmail(null);
        setPendingVerificationEmail(null);
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
  return onSubmit(data);
}
