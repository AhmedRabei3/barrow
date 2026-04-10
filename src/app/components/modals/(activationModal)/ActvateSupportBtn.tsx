"use client";

interface ActivateSupportBtnProps {
  isLoading: boolean;
  redirectingMethod: string | null;
  requestingSupportCode: boolean;
  subscriptionAmount: number;
  isArabic: boolean;
  requestActivationCodeViaSupport: () => Promise<void>;
  setRequestingSupportCode: React.Dispatch<React.SetStateAction<boolean>>;
}

const ActivateSupportBtn = ({
  isLoading,
  redirectingMethod,
  requestingSupportCode,
  isArabic,
  requestActivationCodeViaSupport,
}: ActivateSupportBtnProps) => {
  return (
    <button
      type="button"
      disabled={
        isLoading || redirectingMethod !== null || requestingSupportCode
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
  );
};

export default ActivateSupportBtn;
