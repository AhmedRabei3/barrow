"use client";

export const dynamic = "force-static";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import StatusCard from "@/app/components/ui/StatusCard";

type PaymentState = "error";

export default function PaymentPage() {
  const router = useRouter();
  const { isArabic } = useAppPreferences();
  const [state] = useState<PaymentState>("error");
  const [message, setMessage] = useState(
    isArabic
      ? "تم إيقاف بوابة الدفع هذه في المنصة"
      : "This payment gateway has been disabled on this platform",
  );

  useEffect(() => {
    setMessage(
      isArabic
        ? "تم إيقاف بوابة الدفع هذه في المنصة"
        : "This payment gateway has been disabled on this platform",
    );
  }, [isArabic]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.replace("/");
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [router, state]);

  const title =
    state === "error"
      ? isArabic
        ? "بوابة دفع غير متاحة"
        : "Payment gateway unavailable"
      : isArabic
        ? "بوابة دفع غير متاحة"
        : "Payment gateway unavailable";

  const tone = state === "error" ? "error" : "error";

  return <StatusCard title={title} message={message} tone={tone} />;
}
