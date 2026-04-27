"use client";

import toast from "react-hot-toast";
import ActivateSupportBtn from "./ActvateSupportBtn";
import ShamCashBtn from "./ShamCashBtn";
import useActivationModal from "@/app/hooks/useActivationModal";
import { localizeErrorMessage } from "@/app/i18n/errorMessages";
import { Dispatch, SetStateAction } from "react";

type RedirectPaymentMethod = Exclude<PaymentMethod, "SHAMCASH">;

interface PaymentsBtnProps {
  isLoading: boolean;
  redirectingMethod: string | null;
  requestingSupportCode: boolean;
  subscriptionAmount: number;
  isArabic: boolean;
  isShamCashSubmitting: boolean;
  setRequestingSupportCode: React.Dispatch<React.SetStateAction<boolean>>;
  requestActivationCodeViaSupport: () => Promise<void>;
  setRedirectingMethod: Dispatch<SetStateAction<RedirectPaymentMethod | null>>;
  setShowShamCashModal: React.Dispatch<React.SetStateAction<boolean>>;
}

type PaymentMethod = "PAYPAL" | "CARD" | "SHAMCASH";

const PaymentsBtn = ({
  isLoading,
  redirectingMethod,
  requestingSupportCode,
  subscriptionAmount,
  isArabic,
  isShamCashSubmitting,
  setRequestingSupportCode,
  requestActivationCodeViaSupport,
  setRedirectingMethod,
  setShowShamCashModal,
}: PaymentsBtnProps) => {
  const ActivationModal = useActivationModal();

  const startPaidSubscription = async (method: PaymentMethod) => {
    try {
      if (method === "SHAMCASH") {
        ActivationModal.onClose();
        setTimeout(() => setShowShamCashModal(true), 200); // ضمان إغلاق المودال الأول قبل فتح الثاني
        return;
      }

      if (method === "CARD") {
        throw new Error(
          isArabic
            ? "الدفع بالبطاقة غير متاح حالياً. استخدم شام كاش أو اطلب كود تفعيل."
            : "Card checkout is not available right now. Use ShamCash or request an activation code.",
        );
      }
    } catch (error) {
      console.error(error);
      const rawMessage =
        error instanceof Error
          ? error.message
          : isArabic
            ? "فشل بدء عملية الدفع"
            : "Failed to start payment";
      toast.error(localizeErrorMessage(rawMessage, isArabic));
      setRedirectingMethod(null);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl border border-cyan-300/60 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 dark:border-cyan-600/50 dark:bg-cyan-950/30 dark:text-cyan-100">
        {isArabic
          ? "التفعيل الإلكتروني متاح حالياً عبر شام كاش أو من خلال كود تفعيل رسمي."
          : "Online activation is currently available via ShamCash or an official activation code."}
      </div>
      {/* لا حقاً يتم إضافة الدفع عبر البطاقات الائتمانية */}
      <ShamCashBtn
        isLoading={isLoading}
        redirectingMethod={redirectingMethod}
        requestingSupportCode={requestingSupportCode}
        subscriptionAmount={subscriptionAmount}
        isArabic={isArabic}
        isShamCashSubmitting={isShamCashSubmitting}
        startPaidSubscription={startPaidSubscription}
      />
      <ActivateSupportBtn
        isLoading={isLoading}
        redirectingMethod={redirectingMethod}
        requestingSupportCode={requestingSupportCode}
        subscriptionAmount={subscriptionAmount}
        isArabic={isArabic}
        setRequestingSupportCode={setRequestingSupportCode}
        requestActivationCodeViaSupport={requestActivationCodeViaSupport}
      />
    </div>
  );
};

export default PaymentsBtn;
