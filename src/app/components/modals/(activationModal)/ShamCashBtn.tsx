"use client";

interface PaypalBtnProps {
    isLoading: boolean;
    redirectingMethod: string | null;
    requestingSupportCode: boolean;
    startPaidSubscription: (method: "SHAMCASH") => Promise<void>;
    subscriptionAmount: number;
    isArabic: boolean;
    isShamCashSubmitting: boolean;
}


const ShamCashBtn = ({
    isLoading,
    redirectingMethod,
    requestingSupportCode,
    startPaidSubscription,
    subscriptionAmount,
    isArabic,
    isShamCashSubmitting,
}: PaypalBtnProps) => {
  return (
    <button
            type="button"
            disabled={
              isLoading ||
              redirectingMethod !== null ||
              requestingSupportCode ||
              isShamCashSubmitting
            }
            onClick={() => startPaidSubscription("SHAMCASH")}
            className="w-full rounded-lg border-2 border-slate-500 text-slate-700 py-2.5 px-3 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed hover:bg-slate-50 transition"
          >
            {isArabic
              ? `التفعيل عبر شام كاش (${subscriptionAmount}$)`
              : `Activate with ShamCash (${subscriptionAmount}$)`}
          </button>
  )
}

export default ShamCashBtn