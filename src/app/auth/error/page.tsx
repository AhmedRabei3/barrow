"use client";

export const dynamic = "force-static";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import StatusCard from "@/app/components/ui/StatusCard";

const AUTH_ERROR_MESSAGES_AR: Record<string, string> = {
  OAuthAccountNotLinked:
    "هذا البريد الإلكتروني مرتبط بطريقة تسجيل دخول أخرى. يرجى المحاولة مرة أخرى أو استخدام كلمة المرور.",
  OAuthCallbackError:
    "حدث خطأ أثناء التحقق من حساب غوغل. يرجى المحاولة مرة أخرى.",
  OAuthCreateAccount: "تعذر إنشاء حساب عبر غوغل. يرجى المحاولة مرة أخرى.",
  AccessDenied:
    "تم رفض الوصول. يرجى التأكد من منح التصاريح اللازمة لحساب غوغل.",
  Verification: "رابط التحقق غير صالح أو منتهي الصلاحية.",
  Default: "حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.",
};

function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "Default";

  useEffect(() => {
    const message =
      AUTH_ERROR_MESSAGES_AR[error] ?? AUTH_ERROR_MESSAGES_AR.Default;
    toast.error(message, { duration: 6000 });
    router.replace("/");
  }, [error, router]);

  return (
    <StatusCard title="تنبيه تسجيل الدخول" message="جاري إعادة التوجيه…" />
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <StatusCard title="تنبيه تسجيل الدخول" message="جاري التحميل…" />
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
