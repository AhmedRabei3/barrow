"use client";

import { useCallback, useState } from "react";
import { useEffect } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import useActivationModal from "@/app/hooks/useActivationModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import Modal from "./Modal";
import Heading from "../Heading";
import Input from "../inputs/Input";
import toast from "react-hot-toast";
import { request } from "@/app/utils/axios";
import confetti from "canvas-confetti";
import { useSession } from "next-auth/react";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { localizeErrorMessage } from "@/app/i18n/errorMessages";
import { useRouter } from "next/navigation";

const SUCCESS_SOUND =
  "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3";
const DEFAULT_SUBSCRIPTION_AMOUNT = 30;

type PaymentMethod = "PAYPAL" | "CARD" | "SHAMCASH";

const ActivationModal = () => {
  const { update, data } = useSession();
  const activationModal = useActivationModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);
  const [requestingSupportCode, setRequestingSupportCode] = useState(false);
  const [subscriptionAmount, setSubscriptionAmount] = useState(
    DEFAULT_SUBSCRIPTION_AMOUNT,
  );
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const { isArabic } = useAppPreferences();
  const userId = data?.user?.id;
  const router = useRouter();

  useEffect(() => {
    const loadPaymentSettings = async () => {
      try {
        const res = await request.get("/api/pay/settings");
        const nextAmount = Number(res?.data?.subscriptionMonthlyPrice);
        if (Number.isFinite(nextAmount) && nextAmount > 0) {
          setSubscriptionAmount(Number(nextAmount.toFixed(2)));
        }
      } catch {
        // Keep defaults if settings endpoint fails.
      }
    };

    loadPaymentSettings();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      activationCode: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      setIsLoading(true);
      const result = await request.put("/api/activate", data);

      if (result.data.success) {
        toast.success(
          isArabic ? "تم تفعيل الحساب بنجاح" : "Account activated successfully",
        );

        // 🎉 الكونفتي
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.6 },
        });

        // 🔈 صوت النجاح
        new Audio(SUCCESS_SOUND).play();

        // 🔁 تحديث الجلسة
        await update();

        // 🔔 إبلاغ العداد ليعيد الحساب ويهتز
        dispatchEvent(new Event("activation-updated"));

        activationModal.onClose();
      } else {
        const rawMessage =
          result.data.message ||
          (isArabic ? "فشل التفعيل" : "Activation failed");
        toast.error(localizeErrorMessage(rawMessage, isArabic));
      }
    } catch (error) {
      console.error(error);
      toast.error(isArabic ? "حدث خطأ غير متوقع" : "Unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const startPaidSubscription = async (method: PaymentMethod) => {
    try {
      setSelectedMethod(method);

      if (method === "SHAMCASH") {
        activationModal.onClose();
        router.push("/payment?service=SUBSCRIPTION&method=SHAMCASH");
        return;
      }

      const response = await request.post("/api/pay/fatora", {
        amount: subscriptionAmount,
        type: "SUBSCRIPTION",
        method,
      });

      const checkoutUrl = response?.data?.url;
      if (!checkoutUrl) {
        throw new Error(
          isArabic ? "تعذر إنشاء رابط الدفع" : "Unable to create payment URL",
        );
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      console.error(error);
      const rawMessage =
        error instanceof Error
          ? error.message
          : isArabic
            ? "فشل بدء عملية الدفع"
            : "Failed to start payment";
      toast.error(localizeErrorMessage(rawMessage, isArabic));
      setSelectedMethod(null);
    }
  };

  const requestActivationCodeViaSupport = async () => {
    try {
      setRequestingSupportCode(true);
      const response = await request.post(
        "/api/support/activation-code-request",
        {
          contactEmail: data?.user?.email || "",
        },
      );

      toast.success(
        response?.data?.message ||
          (isArabic
            ? "تم إرسال طلب كود التفعيل إلى مركز المساعدة"
            : "Activation-code request sent to support center"),
      );

      activationModal.onClose();
    } catch (error) {
      const rawMessage =
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر إرسال طلب كود التفعيل"
            : "Failed to send activation-code request";
      toast.error(localizeErrorMessage(rawMessage, isArabic));
    } finally {
      setRequestingSupportCode(false);
    }
  };

  const toggle = useCallback(() => {
    activationModal.onClose();
    loginModal.onOpen();
  }, [loginModal, activationModal]);

  const bodyContent = (
    <div className="flex flex-col gap-3">
      <Heading
        title={isArabic ? "تفعيل الحساب" : "Activate"}
        subtitle={
          isArabic
            ? "فعّل حسابك واستفد من كامل الميزات"
            : "Activate your account & enjoy the great features"
        }
      />
      <Input
        id="activationCode"
        label={isArabic ? "رمز التفعيل" : "Your Activation Code"}
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />

      <div className="mt-2 border-t pt-3">
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
          {isArabic
            ? "أو فعّل اشتراكك مباشرة عبر إحدى وسائل الدفع"
            : "Or activate your subscription directly with a payment method"}
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={
              isLoading || selectedMethod !== null || requestingSupportCode
            }
            onClick={() => startPaidSubscription("PAYPAL")}
            className="w-full rounded-lg bg-sky-950 text-white py-2.5 px-3 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90 transition"
          >
            {selectedMethod === "PAYPAL"
              ? isArabic
                ? "جارٍ التحويل إلى PayPal..."
                : "Redirecting to PayPal..."
              : isArabic
                ? `التفعيل عبر PayPal (${subscriptionAmount}$)`
                : `Activate with PayPal (${subscriptionAmount}$)`}
          </button>

          <button
            type="button"
            disabled={
              isLoading || selectedMethod !== null || requestingSupportCode
            }
            onClick={() => startPaidSubscription("CARD")}
            className="w-full rounded-lg border-2 border-sky-950 text-sky-950 py-2.5 px-3 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed hover:bg-sky-50 transition"
          >
            {selectedMethod === "CARD"
              ? isArabic
                ? "جارٍ التحويل لبوابة البطاقة..."
                : "Redirecting to card checkout..."
              : isArabic
                ? `التفعيل عبر البطاقات الائتمانية (${subscriptionAmount}$)`
                : `Activate with Credit Card (${subscriptionAmount}$)`}
          </button>

          <button
            type="button"
            disabled={
              isLoading || selectedMethod !== null || requestingSupportCode
            }
            onClick={() => startPaidSubscription("SHAMCASH")}
            className="w-full rounded-lg border-2 border-slate-500 text-slate-700 py-2.5 px-3 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed hover:bg-slate-50 transition"
          >
            {selectedMethod === "SHAMCASH"
              ? isArabic
                ? "جارٍ التحويل إلى ShamCash..."
                : "Redirecting to ShamCash..."
              : isArabic
                ? `التفعيل عبر شام كاش (${subscriptionAmount}$)`
                : `Activate with ShamCash (${subscriptionAmount}$)`}
          </button>

          <button
            type="button"
            disabled={
              isLoading || selectedMethod !== null || requestingSupportCode
            }
            onClick={requestActivationCodeViaSupport}
            className="w-full rounded-lg bg-emerald-700 text-white py-2.5 px-3 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed hover:bg-emerald-800 transition"
          >
            {requestingSupportCode
              ? isArabic
                ? "جارٍ إرسال الطلب..."
                : "Sending request..."
              : isArabic
                ? "طلب شراء كود تفعيل عبر مركز المساعدة"
                : "Request activation code via support center"}
          </button>
        </div>
      </div>
    </div>
  );

  const footerContent = !userId ? (
    <div className="flex flex-col gap-2 mt-3">
      <hr />
      <div className="text-slate-600 dark:text-slate-300 text-center mt-1 font-light">
        <div className="justify-center flex flex-row items-center gap-2">
          <span>{isArabic ? "تسجيل الدخول" : "Login"}</span>
          <div
            onClick={toggle}
            className="hover:underline cursor-pointer text-sky-700 dark:text-sky-300"
          >
            {isArabic ? "من هنا" : "from here"}
          </div>
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <Modal
      disabled={isLoading}
      isOpen={activationModal.isOpen}
      title={isArabic ? "تفعيل الحساب" : "Activate Account"}
      actionLabel={isArabic ? "تفعيل" : "Activate"}
      onClose={activationModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
};

export default ActivationModal;
