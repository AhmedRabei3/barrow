"use client";

import { useEffect, useState } from "react";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";
import Image from "next/image";

const ShamCashModal = ({
  isOpen,
  onClose,
  qrUrl,
  walletCode,
  onSubmitTransaction,
  isSubmitting,
  amount,
}: {
  isOpen: boolean;
  onClose: () => void;
  qrUrl: string;
  walletCode: string;
  onSubmitTransaction: (tx: string) => void | Promise<void>;
  isSubmitting: boolean;
  amount: number;
}) => {
  const [step, setStep] = useState<"qr" | "input">("qr");
  const [txNumber, setTxNumber] = useState("");
  const [error, setError] = useState("");
  const { isArabic } = useAppPreferences();

  useEffect(() => {
    if (!isOpen) {
      setStep("qr");
      setTxNumber("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center bg-black/60 dark:bg-black/80"
      style={{ zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-xs flex flex-col items-center relative border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4 text-center text-slate-800 dark:text-slate-100">
          محفظة شام كاش
        </h2>
        {qrUrl ? (
          <Image
            src={qrUrl}
            alt="ShamCash QR"
            width={180}
            height={180}
            className="w-40 h-40 object-contain border border-slate-300 dark:border-slate-700 rounded mb-4"
          />
        ) : (
          <div className="w-40 h-40 rounded border border-dashed border-slate-300 dark:border-slate-700 mb-4 flex items-center justify-center text-center text-xs text-slate-500 px-3">
            {isArabic
              ? "لم يتم ضبط صورة QR لشام كاش بعد. يرجى التواصل مع الإدارة."
              : "ShamCash QR is not configured yet. Please contact the admin."}
          </div>
        )}
        {walletCode ? (
          <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isArabic ? "كود محفظة التطبيق" : "Application wallet code"}
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
              {walletCode}
            </p>
          </div>
        ) : null}
        <p className="text-xs text-slate-600 dark:text-slate-300 text-center mb-2">
          {isArabic
            ? `المبلغ المطلوب للتفعيل: ${amount.toFixed(2)} USD`
            : `Required activation amount: ${amount.toFixed(2)} USD`}
        </p>
        {step === "qr" && (
          <div className="flex gap-2 w-full mt-2">
            <button
              className="flex-1 py-2 rounded-lg font-semibold bg-indigo-700 hover:bg-indigo-800 text-white transition shadow-md"
              disabled={!qrUrl && !walletCode}
              onClick={() => setStep("input")}
              type="button"
            >
              تم الدفع
            </button>
            <button
              className="flex-1 py-2 rounded-lg font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 transition shadow-md"
              onClick={onClose}
              type="button"
            >
              إغلاق
            </button>
          </div>
        )}
        {step === "input" && (
          <form
            className="w-full flex flex-col gap-2 mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (isSubmitting) {
                return;
              }
              if (!txNumber.trim()) {
                setError(
                  isArabic
                    ? "يرجى إدخال رقم العملية بصيغة تبدأ بـ #"
                    : "Please enter the transaction number starting with #",
                );
                return;
              }
              setError("");
              onSubmitTransaction(txNumber.trim());
            }}
          >
            <input
              type="text"
              disabled={isSubmitting}
              className="w-full p-2 border rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              placeholder={isArabic ? "مثال: #123456" : "Example: #123456"}
              value={txNumber}
              onChange={(e) => setTxNumber(e.target.value)}
              autoFocus
            />
            {error && (
              <span className="text-red-600 text-xs mb-1">{error}</span>
            )}
            <div className="flex gap-2 w-full">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 rounded-lg font-semibold bg-indigo-700 hover:bg-indigo-800 text-white transition shadow-md"
              >
                {isSubmitting
                  ? isArabic
                    ? "جارٍ التحقق..."
                    : "Verifying..."
                  : isArabic
                    ? "إرسال"
                    : "Submit"}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="flex-1 py-2 rounded-lg font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 transition shadow-md"
                onClick={onClose}
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ShamCashModal;
