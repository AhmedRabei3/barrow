"use client";

interface SyriatelCashButtonProps {
  isLoading: boolean;
  redirectingMethod: string | null;
  requestingSupportCode: boolean;
  startPaidSubscription: (method: "SYRIATEL_CASH") => Promise<void>;
  subscriptionAmount: number;
  isArabic: boolean;
  isSyriatelCashSubmitting: boolean;
}

const SyriatelCashBtn = ({
  isLoading,
  redirectingMethod,
  requestingSupportCode,
  startPaidSubscription,
  subscriptionAmount,
  isArabic,
  isSyriatelCashSubmitting,
}: SyriatelCashButtonProps) => {
  return (
    <button
      type="button"
      disabled={
        isLoading ||
        redirectingMethod !== null ||
        requestingSupportCode ||
        isSyriatelCashSubmitting
      }
      onClick={() => startPaidSubscription("SYRIATEL_CASH")}
      className="w-full rounded-xl border border-amber-400/70 bg-linear-to-r from-amber-50 to-orange-100 px-3 py-3 text-sm font-semibold text-amber-950 shadow-sm shadow-amber-200/70 transition hover:from-amber-100 hover:to-orange-200 disabled:cursor-not-allowed disabled:opacity-70 dark:border-amber-400/50 dark:bg-linear-to-r dark:from-amber-500/18 dark:to-orange-500/24 dark:text-amber-50 dark:shadow-[0_10px_24px_rgba(245,158,11,0.18)] dark:hover:from-amber-500/24 dark:hover:to-orange-500/32"
    >
      {isArabic
        ? `التفعيل عبر سيريتل كاش (${subscriptionAmount}$)`
        : `Activate with Syriatel Cash (${subscriptionAmount}$)`}
    </button>
  );
};

export default SyriatelCashBtn;
