"use client";

interface PaypalBtnProps {
  isLoading: boolean;
  redirectingMethod: string | null;
  requestingSupportCode: boolean;
  startPaidSubscription: (method: string) => void;
  subscriptionAmount: number;
  isArabic: boolean;
}

const PaypalBtn: React.FC<PaypalBtnProps> = ({
  isLoading,
  redirectingMethod,
  requestingSupportCode,
  startPaidSubscription,
  subscriptionAmount,
  isArabic,
}) => {
  return (
    <button
      type="button"
      disabled={
        isLoading || redirectingMethod !== null || requestingSupportCode
      }
      onClick={() => startPaidSubscription("PAYPAL")}
      className="w-full rounded-lg bg-sky-950 text-white py-2.5 px-3 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90 transition"
    >
      {redirectingMethod === "PAYPAL"
        ? isArabic
          ? "جارٍ التحويل إلى PayPal..."
          : "Redirecting to PayPal..."
        : isArabic
          ? `التفعيل عبر PayPal (${subscriptionAmount}$)`
          : `Activate with PayPal (${subscriptionAmount}$)`}
    </button>
  );
};

export default PaypalBtn;
