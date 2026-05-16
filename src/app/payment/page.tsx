"use client";

export const dynamic = "force-static";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { request } from "@/app/utils/axios";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { localizeErrorMessage } from "@/app/i18n/errorMessages";
import StatusCard from "@/app/components/ui/StatusCard";

type PaymentState = "loading" | "success" | "cancelled" | "error";
const ACTIVATION_PENDING_KEY = "barrow:activation-celebration-pending";

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
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(ACTIVATION_PENDING_KEY, "1");
        }
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

  const title =
    state === "success"
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
            : "Confirming Payment";

  const tone =
    state === "success"
      ? "success"
      : state === "cancelled"
        ? "warning"
        : state === "error"
          ? "error"
          : "neutral";

  return <StatusCard title={title} message={message} tone={tone} />;
}
