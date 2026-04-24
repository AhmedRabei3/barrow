"use client";

import toast from "react-hot-toast";
import ActivateSupportBtn from "./ActvateSupportBtn";
import PaypalBtn from "./PaypalBtn";
import ShamCashBtn from "./ShamCashBtn";
import useActivationModal from "@/app/hooks/useActivationModal";
import { localizeErrorMessage } from "@/app/i18n/errorMessages";
import { request } from "@/app/utils/axios";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

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
const PAYPAL_UNSUPPORTED_REGION_CODES = new Set(["SY"]);

const detectBrowserRegion = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const localeCandidates = [
    window.navigator.language,
    ...(window.navigator.languages ?? []),
    Intl.DateTimeFormat().resolvedOptions().locale,
  ].filter(Boolean);

  for (const localeCandidate of localeCandidates) {
    const locale = String(localeCandidate);

    try {
      const region = new Intl.Locale(locale).region;
      if (region) {
        return region.toUpperCase();
      }
    } catch {}

    const match = locale.match(/[-_](\w{2})\b/);
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  return null;
};

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
  const [isPaypalHiddenForRegion, setIsPaypalHiddenForRegion] = useState(false);

  useEffect(() => {
    const region = detectBrowserRegion();
    setIsPaypalHiddenForRegion(
      Boolean(region && PAYPAL_UNSUPPORTED_REGION_CODES.has(region)),
    );
  }, []);

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
      {isPaypalHiddenForRegion ? (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-600/50 dark:bg-amber-950/30 dark:text-amber-100">
          {isArabic
            ? "تم إخفاء التفعيل عبر PayPal لأن منطقة المتصفح الحالية تبدو من الدول التي لا تدعمها PayPal. يمكنك استخدام شام كاش أو طلب كود تفعيل."
            : "PayPal activation is hidden because your current browser region appears to be in a country where PayPal is not supported. Use ShamCash or request an activation code instead."}
        </div>
      ) : (
        <PaypalBtn
          isLoading={isLoading}
          redirectingMethod={redirectingMethod}
          requestingSupportCode={requestingSupportCode}
          startPaidSubscription={() => startPaidSubscription("PAYPAL")}
          subscriptionAmount={subscriptionAmount}
          isArabic={isArabic}
        />
      )}
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
