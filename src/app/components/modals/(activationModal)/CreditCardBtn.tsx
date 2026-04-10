"use client";

interface PaypalBtnProps {
    isLoading: boolean;
    redirectingMethod: string | null;
    requestingSupportCode: boolean;
    startPaidSubscription: (method: "CARD") => Promise<void>;
    subscriptionAmount: number;
    isArabic: boolean;
}

const CreditCardBtn = ({
  isLoading,
  redirectingMethod,
  requestingSupportCode,
  startPaidSubscription,
  subscriptionAmount,
  isArabic,
}: PaypalBtnProps) => {
  return (
    <button
            type="button"
            disabled={
              isLoading || redirectingMethod !== null || requestingSupportCode
            }
            onClick={() => startPaidSubscription("CARD")}
            className="w-full rounded-lg border-2 border-sky-950 text-sky-950 py-2.5 px-3 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed hover:bg-sky-50 transition"
          >
            {redirectingMethod === "CARD"
              ? isArabic
                ? "جارٍ التحويل لبوابة البطاقة..."
                : "Redirecting to card checkout..."
              : isArabic
                ? `التفعيل عبر البطاقات الائتمانية (${subscriptionAmount}$)`
                : `Activate with Credit Card (${subscriptionAmount}$)`}
          </button>
  )
}

export default CreditCardBtn