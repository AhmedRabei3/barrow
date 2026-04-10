"use client";

import toast from "react-hot-toast";
import ActivateSupportBtn from "./ActvateSupportBtn";
import PaypalBtn from "./PaypalBtn";
import ShamCashBtn from "./ShamCashBtn";
import useActivationModal from "@/app/hooks/useActivationModal";
import { localizeErrorMessage } from "@/app/i18n/errorMessages";
import { request } from "@/app/utils/axios";
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
  setRedirectingMethod: Dispatch<SetStateAction<RedirectPaymentMethod | null>>
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
            ? "الدفع بالبطاقة غير متاح حالياً. استخدم PayPal أو شام كاش أو اطلب كود تفعيل."
            : "Card checkout is not available right now. Use PayPal, ShamCash, or request an activation code.",
        );
      }

      setRedirectingMethod(method);

      const response = await request.post("/api/pay/paypal/order", {
        amount: subscriptionAmount,
        type: "SUBSCRIPTION",
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
      setRedirectingMethod(null);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <PaypalBtn
        isLoading={isLoading}
        redirectingMethod={redirectingMethod}
        requestingSupportCode={requestingSupportCode}
        startPaidSubscription={() => startPaidSubscription("PAYPAL")}
        subscriptionAmount={subscriptionAmount}
        isArabic={isArabic}
      />
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
