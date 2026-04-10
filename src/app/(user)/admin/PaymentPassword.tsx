"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { request } from "@/app/utils/axios";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import Input from "@/app/components/inputs/Input";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import Modal from "@/app/components/modals/Modal";
import usePaymentPasswordModal from "@/app/hooks/usePasswordPaymentModal";
import toast from "react-hot-toast";

interface PaymentPasswordProps {
  onAuthorized: () => void;
}

const PaymentPassword = ({ onAuthorized }: PaymentPasswordProps) => {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [resetTokenStatus, setResetTokenStatus] = useState<
    "idle" | "verifying" | "valid" | "invalid"
  >("idle");
  const passwordModal = usePaymentPasswordModal();
  const searchParams = useSearchParams();
  const resetToken = String(searchParams.get("paymentResetToken") || "").trim();
  const isResetFlow = Boolean(resetToken) && resetTokenStatus === "valid";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!passwordModal.isOpen) {
      return;
    }

    const fetchPassword = async () => {
      try {
        setLoading(true);
        const response = await request.get(
          "/api/admin/payment-settings/check-password",
        );
        setHasPassword(Boolean(response.data?.hasPassword));
      } catch (error) {
        console.error("Error fetching password:", error);
        toast.error(
          t("تعذر تحميل حالة كلمة المرور", "Failed to load password status"),
        );
        passwordModal.onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchPassword();
  }, [passwordModal, passwordModal.isOpen, t]);

  useEffect(() => {
    if (!passwordModal.isOpen) {
      return;
    }

    if (!resetToken) {
      setResetTokenStatus("idle");
      return;
    }

    const verifyResetToken = async () => {
      try {
        setResetTokenStatus("verifying");
        await request.get(
          `/api/admin/payment-settings/reset-password/verify?token=${encodeURIComponent(resetToken)}`,
        );
        setResetTokenStatus("valid");
      } catch {
        setResetTokenStatus("invalid");
      }
    };

    verifyResetToken();
  }, [passwordModal.isOpen, resetToken]);

  const clearResetToken = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("paymentResetToken");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const requestResetLink = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request.post(
        "/api/admin/payment-settings/reset-password/request",
      );
      toast.success(
        res.data?.message ||
          t("تم إرسال رابط إعادة التعيين.", "The reset link has been sent."),
      );
    } catch (error: unknown) {
      const fallbackMessage = t(
        "تعذر إرسال رابط إعادة التعيين",
        "Failed to send the reset link",
      );
      const message: string =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || fallbackMessage
          : fallbackMessage;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const contentBody = (
    <div className="flex flex-col gap-2">
      {resetTokenStatus === "verifying" && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("جارٍ التحقق من رابط إعادة التعيين...", "Verifying reset link...")}
        </p>
      )}

      {resetTokenStatus === "invalid" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          <p>
            {t(
              "رابط إعادة التعيين غير صالح أو انتهت صلاحيته. يمكنك طلب رابط جديد.",
              "The reset link is invalid or expired. You can request a new one.",
            )}
          </p>
        </div>
      )}

      <Input
        id="password"
        label={
          isResetFlow
            ? t("كلمة المرور الجديدة", "New password")
            : t("كلمة المرور", "Password")
        }
        type={showPassword ? "text" : "password"}
        register={register}
        errors={errors}
        iconName={showPassword ? "eye-off" : "eye"}
        onIconClick={() => setShowPassword((prev) => !prev)}
        required
      />
      {(hasPassword === false || isResetFlow) && (
        <Input
          id="confirmPassword"
          label={t("تأكيد كلمة المرور", "Confirm Password")}
          type={showConfirmPassword ? "text" : "password"}
          register={register}
          errors={errors}
          iconName={showConfirmPassword ? "eye-off" : "eye"}
          onIconClick={() => setShowConfirmPassword((prev) => !prev)}
          required
        />
      )}

      {hasPassword && !resetToken && (
        <button
          type="button"
          onClick={requestResetLink}
          disabled={loading}
          className="mt-2 self-start text-sm font-medium text-sky-700 transition hover:text-sky-800 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-sky-300 dark:hover:text-sky-200"
        >
          {t(
            "إرسال رابط إعادة تعيين إلى البريد المحدد",
            "Send a reset link to the configured email",
          )}
        </button>
      )}
    </div>
  );

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (hasPassword === null) {
      return;
    }

    if (isResetFlow) {
      if (String(data.password || "").length < 6) {
        toast.error(
          t("كلمة المرور قصيرة جدًا", "Password too short (min 6 characters)"),
        );
        return;
      }

      if (data.password !== data.confirmPassword) {
        toast.error(t("كلمتا المرور غير متطابقتين", "Passwords do not match"));
        return;
      }

      try {
        setLoading(true);
        const res = await request.post(
          "/api/admin/payment-settings/reset-password/confirm",
          {
            token: resetToken,
            password: data.password,
          },
        );

        if (!res.data?.ok) {
          toast.error(
            res.data?.message ||
              t("فشل إعادة تعيين كلمة المرور", "Failed to reset password"),
          );
          return;
        }

        toast.success(
          res.data?.message ||
            t("تم تحديث كلمة المرور بنجاح", "Password updated successfully"),
        );
        clearResetToken();
        passwordModal.onClose();
        onAuthorized();
      } catch (error: unknown) {
        const fallbackMessage = t(
          "فشل إعادة تعيين كلمة المرور",
          "Failed to reset password",
        );
        const message: string =
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
            ? (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message || fallbackMessage
            : fallbackMessage;
        toast.error(message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (hasPassword) {
      try {
        setLoading(true);
        const res = await request.post(
          "/api/admin/payment-settings/check-password",
          {
            password: data.password,
          },
        );

        if (!res.data?.ok) {
          toast.error(t("كلمة المرور غير صحيحة", "Incorrect password"));
          return;
        }

        passwordModal.onClose();
        onAuthorized();
      } catch {
        toast.error(
          t("خطأ في التحقق من كلمة المرور", "Error verifying password"),
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (String(data.password || "").length < 6) {
      toast.error(
        t("كلمة المرور قصيرة جدًا", "Password too short (min 6 characters)"),
      );
      return;
    }

    if (data.password !== data.confirmPassword) {
      toast.error(t("كلمتا المرور غير متطابقتين", "Passwords do not match"));
      return;
    }

    try {
      setLoading(true);
      const res = await request.post("/api/admin/payment-settings", {
        password: data.password,
      });

      if (!res.data?.ok) {
        toast.error(
          res.data?.message ||
            t("خطأ في إنشاء كلمة المرور", "Error creating password"),
        );
        return;
      }

      toast.success(
        t("تم إنشاء كلمة المرور بنجاح", "Password created successfully"),
      );
      passwordModal.onClose();
      onAuthorized();
    } catch {
      toast.error(t("خطأ في إنشاء كلمة المرور", "Error creating password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        isResetFlow
          ? t(
              "إعادة تعيين كلمة مرور إعدادات الدفع",
              "Reset Payment Settings Password",
            )
          : hasPassword
            ? t("كلمة مرور إعدادات الدفع", "Payment Settings Password")
            : t(
                "إنشاء كلمة مرور إعدادات الدفع",
                "Create Payment Settings Password",
              )
      }
      body={contentBody}
      onClose={passwordModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      actionLabel={
        isResetFlow
          ? t("حفظ كلمة المرور الجديدة", "Save new password")
          : hasPassword
            ? t("متابعة", "Continue")
            : t("إنشاء", "Create")
      }
      disabled={
        loading ||
        hasPassword === null ||
        resetTokenStatus === "verifying" ||
        (Boolean(resetToken) && resetTokenStatus === "invalid")
      }
      isOpen={passwordModal.isOpen}
      reset={reset}
    />
  );
};

export default memo(PaymentPassword);
