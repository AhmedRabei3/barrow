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
      className="w-full rounded-xl border border-cyan-400/70 bg-linear-to-r from-cyan-50 to-sky-100 px-3 py-3 text-sm font-semibold text-cyan-950 shadow-sm shadow-cyan-200/70 transition hover:from-cyan-100 hover:to-sky-200 disabled:cursor-not-allowed disabled:opacity-70 dark:border-cyan-400/50 dark:bg-linear-to-r dark:from-cyan-500/18 dark:to-sky-500/24 dark:text-cyan-50 dark:shadow-[0_10px_24px_rgba(6,182,212,0.18)] dark:hover:from-cyan-500/24 dark:hover:to-sky-500/32"
    >
      {isArabic
        ? `التفعيل عبر شام كاش (${subscriptionAmount}$)`
        : `Activate with ShamCash (${subscriptionAmount}$)`}
    </button>
  );
};

export default ShamCashBtn;
