"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { request } from "@/app/utils/axios";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { localizeErrorMessage } from "@/app/i18n/errorMessages";

type PaymentState = "loading" | "success" | "cancelled" | "error";

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update } = useSession();
  const { isArabic } = useAppPreferences();
  const hasStartedRef = useRef(false);
  const [state, setState] = useState<PaymentState>("loading");
  const [message, setMessage] = useState(
    isArabic ? "جارٍ تأكيد الدفع..." : "Confirming payment...",
  );

  useEffect(() => {
    const gateway = String(searchParams.get("gateway") || "").trim();
    const status = String(searchParams.get("status") || "").trim();
    const orderId = String(searchParams.get("token") || "").trim();

    if (gateway !== "paypal") {
      setState("error");
      setMessage(
        isArabic
          ? "بوابة الدفع غير مدعومة في هذه الصفحة"
          : "This payment gateway is not supported on this page",
      );
      return;
    }

    if (status === "cancelled") {
      setState("cancelled");
      setMessage(
        isArabic ? "تم إلغاء عملية الدفع" : "The payment was cancelled",
      );
      return;
    }

    if (status !== "success" || !orderId) {
      setState("error");
      setMessage(
        isArabic
          ? "بيانات العودة من PayPal غير مكتملة"
          : "The PayPal return payload is incomplete",
      );
      return;
    }

    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    void (async () => {
      try {
        const response = await request.post("/api/pay/paypal/capture", {
          orderId,
        });

        await update();
        dispatchEvent(new Event("activation-updated"));

        setState("success");
        setMessage(
          response.data?.message ||
            (isArabic
              ? "تم تأكيد الدفع وتفعيل الحساب بنجاح"
              : "Payment confirmed and account activated successfully"),
        );
        toast.success(
          isArabic
            ? "تم تأكيد دفع PayPal بنجاح"
            : "PayPal payment confirmed successfully",
        );
      } catch (error) {
        const rawMessage =
          error instanceof Error
            ? error.message
            : isArabic
              ? "تعذر تأكيد دفع PayPal"
              : "Failed to confirm PayPal payment";

        const localizedMessage = localizeErrorMessage(rawMessage, isArabic);
        setState("error");
        setMessage(localizedMessage);
        toast.error(localizedMessage);
      }
    })();
  }, [isArabic, searchParams, update]);

  useEffect(() => {
    if (state === "loading") {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace("/");
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [router, state]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 py-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {state === "success"
            ? isArabic
              ? "تم الدفع بنجاح"
              : "Payment Successful"
            : state === "cancelled"
              ? isArabic
                ? "تم إلغاء العملية"
                : "Payment Cancelled"
              : state === "error"
                ? isArabic
                  ? "تعذر إكمال العملية"
                  : "Payment Failed"
                : isArabic
                  ? "جارٍ تأكيد الدفع"
                  : "Confirming Payment"}
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {message}
        </p>
      </section>
    </main>
  );
}
